-- Ticket Cleanup System for Smart Queue Management
-- Run this SQL in your Supabase SQL Editor

-- 1. Create tickets_archive table for historical data (optional)
CREATE TABLE IF NOT EXISTS public.tickets_archive (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    original_ticket_id uuid NOT NULL,
    department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    ticket_number text NOT NULL,
    customer_phone text NOT NULL,
    status text NOT NULL CHECK (status IN ('completed', 'cancelled')),
    priority integer DEFAULT 1,
    estimated_service_time integer,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    called_at timestamp with time zone,
    completed_at timestamp with time zone,
    archived_at timestamp with time zone DEFAULT now()
);

-- Add RLS to archive table
ALTER TABLE public.tickets_archive ENABLE ROW LEVEL SECURITY;

-- Archive table policies (same as tickets table for consistency)
CREATE POLICY "Enable read access for authenticated users on tickets_archive" ON public.tickets_archive
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users on tickets_archive" ON public.tickets_archive
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_tickets(
    hours_old integer DEFAULT 24,
    archive_before_delete boolean DEFAULT true
)
RETURNS TABLE (
    total_cleaned integer,
    total_archived integer,
    departments_affected integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleanup_cutoff timestamp with time zone;
    archived_count integer := 0;
    deleted_count integer := 0;
    dept_count integer := 0;
BEGIN
    -- Calculate cutoff time
    cleanup_cutoff := now() - (hours_old || ' hours')::interval;
    
    -- Archive tickets before deletion if requested
    IF archive_before_delete THEN
        INSERT INTO public.tickets_archive (
            original_ticket_id, department_id, ticket_number, customer_phone,
            status, priority, estimated_service_time, created_at, updated_at,
            called_at, completed_at
        )
        SELECT 
            id, department_id, ticket_number, customer_phone,
            status, priority, estimated_service_time, created_at, updated_at,
            called_at, completed_at
        FROM public.tickets
        WHERE status IN ('completed', 'cancelled')
          AND updated_at < cleanup_cutoff;
        
        GET DIAGNOSTICS archived_count = ROW_COUNT;
    END IF;
    
    -- Count affected departments
    SELECT COUNT(DISTINCT department_id) INTO dept_count
    FROM public.tickets
    WHERE status IN ('completed', 'cancelled')
      AND updated_at < cleanup_cutoff;
    
    -- Delete old completed/cancelled tickets
    DELETE FROM public.tickets
    WHERE status IN ('completed', 'cancelled')
      AND updated_at < cleanup_cutoff;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Return results
    RETURN QUERY SELECT deleted_count, archived_count, dept_count;
END;
$$;

-- 3. Create automated cleanup procedure (runs daily)
CREATE OR REPLACE FUNCTION auto_cleanup_tickets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result record;
BEGIN
    -- Clean up tickets older than 24 hours
    SELECT * INTO result FROM cleanup_old_tickets(24, true);
    
    -- Log the cleanup (you can modify this to your logging system)
    RAISE NOTICE 'Auto cleanup completed: % tickets deleted, % archived, % departments affected', 
        result.total_cleaned, result.total_archived, result.departments_affected;
END;
$$;

-- 4. Create cleanup statistics view
CREATE OR REPLACE VIEW ticket_cleanup_stats AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as tickets_created,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
    COUNT(CASE WHEN status IN ('waiting', 'serving') THEN 1 END) as active
FROM public.tickets
WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days')
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- 5. Manual cleanup commands (for immediate use)

-- Clean tickets older than 24 hours (with archiving)
-- SELECT * FROM cleanup_old_tickets(24, true);

-- Clean tickets older than 12 hours (without archiving)
-- SELECT * FROM cleanup_old_tickets(12, false);

-- Clean all completed/cancelled tickets (emergency cleanup)
-- SELECT * FROM cleanup_old_tickets(0, true);

-- View cleanup statistics
-- SELECT * FROM ticket_cleanup_stats;

-- View current active tickets count
-- SELECT 
--     d.name as department,
--     COUNT(CASE WHEN t.status IN ('waiting', 'serving') THEN 1 END) as active_tickets,
--     COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_today,
--     COUNT(CASE WHEN t.status = 'cancelled' THEN 1 END) as cancelled_today
-- FROM departments d
-- LEFT JOIN tickets t ON d.id = t.department_id 
--     AND t.created_at >= CURRENT_DATE
-- GROUP BY d.id, d.name
-- ORDER BY active_tickets DESC;

COMMENT ON FUNCTION cleanup_old_tickets IS 'Cleans up old completed/cancelled tickets with optional archiving';
COMMENT ON FUNCTION auto_cleanup_tickets IS 'Automated daily cleanup of old tickets';
COMMENT ON VIEW ticket_cleanup_stats IS 'Daily statistics for ticket creation and completion';
