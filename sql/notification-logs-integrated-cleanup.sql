-- Integrate Notification Logs Cleanup with Existing Ticket Cleanup System
-- This extends your existing ticket cleanup to include notification logs

-- 1. Update existing cleanup function to include notification logs
CREATE OR REPLACE FUNCTION cleanup_old_tickets_with_notifications(
    hours_old integer DEFAULT 24,
    archive_before_delete boolean DEFAULT true,
    cleanup_notifications boolean DEFAULT true,
    notification_retention_hours integer DEFAULT 2
)
RETURNS TABLE (
    total_tickets_cleaned integer,
    total_tickets_archived integer,
    departments_affected integer,
    notifications_cleaned integer,
    cleanup_summary text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleanup_cutoff timestamp with time zone;
    archived_count integer := 0;
    deleted_count integer := 0;
    dept_count integer := 0;
    notif_deleted integer := 0;
    summary_text text;
BEGIN
    -- Calculate cutoff time
    cleanup_cutoff := NOW() - (hours_old || ' hours')::INTERVAL;
    
    -- Archive tickets if requested
    IF archive_before_delete THEN
        INSERT INTO tickets_archive (
            original_ticket_id, department_id, ticket_number, customer_phone,
            status, priority, estimated_service_time, created_at, updated_at,
            called_at, completed_at
        )
        SELECT 
            id, department_id, ticket_number, customer_phone,
            status, priority, estimated_service_time, created_at, updated_at,
            called_at, completed_at
        FROM tickets
        WHERE status IN ('completed', 'cancelled')
        AND updated_at < cleanup_cutoff;
        
        GET DIAGNOSTICS archived_count = ROW_COUNT;
    END IF;
    
    -- Clean up old tickets
    DELETE FROM tickets
    WHERE status IN ('completed', 'cancelled')
    AND updated_at < cleanup_cutoff;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Count affected departments
    SELECT COUNT(DISTINCT department_id) INTO dept_count
    FROM tickets
    WHERE status IN ('completed', 'cancelled')
    AND updated_at < cleanup_cutoff;
    
    -- Clean up notification logs if requested
    -- IMPORTANT: We only clean notification_logs (push history), 
    -- NEVER notification_preferences (user device subscriptions)
    IF cleanup_notifications THEN
        -- Delete successful notifications older than retention period
        DELETE FROM notification_logs 
        WHERE push_success = true 
        AND created_at < NOW() - (notification_retention_hours || ' hours')::INTERVAL;
        
        -- Add failed notification count to the delete
        DELETE FROM notification_logs 
        WHERE (push_success = false OR push_success IS NULL)
        AND created_at < cleanup_cutoff;
        
        GET DIAGNOSTICS notif_deleted = ROW_COUNT;
    END IF;
    
    -- Create summary
    summary_text := format(
        'Tickets: %s deleted, %s archived. Notifications: %s cleaned. Departments: %s affected.',
        deleted_count, archived_count, notif_deleted, dept_count
    );
    
    -- Log cleanup activity
    INSERT INTO ticket_cleanup_stats (
        organization_id,
        cleanup_type,
        total_processed,
        details,
        created_at
    ) VALUES (
        'system'::uuid,
        'comprehensive_cleanup',
        deleted_count + notif_deleted,
        jsonb_build_object(
            'tickets_deleted', deleted_count,
            'tickets_archived', archived_count,
            'notifications_cleaned', notif_deleted,
            'departments_affected', dept_count
        ),
        NOW()
    );
    
    RETURN QUERY SELECT 
        deleted_count,
        archived_count,
        dept_count,
        notif_deleted,
        summary_text;
END;
$$;

-- 2. Add notification cleanup to existing automated cleanup
CREATE OR REPLACE FUNCTION automated_comprehensive_cleanup()
RETURNS TABLE (
    cleanup_type text,
    items_processed integer,
    success boolean,
    message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    ticket_result record;
    notification_result record;
BEGIN
    -- Run comprehensive cleanup
    SELECT * INTO ticket_result 
    FROM cleanup_old_tickets_with_notifications(24, true, true, 2)
    LIMIT 1;
    
    -- Return results
    RETURN QUERY SELECT 
        'comprehensive'::text,
        (ticket_result.total_tickets_cleaned + ticket_result.notifications_cleaned)::integer,
        true,
        ticket_result.cleanup_summary;
END;
$$;

-- 3. Update existing TicketCleanupManager component to show notification stats
-- This SQL creates a view for the admin dashboard to show notification log statistics

CREATE OR REPLACE VIEW notification_logs_stats AS
SELECT 
    o.name as organization_name,
    COUNT(*) as total_logs,
    COUNT(CASE WHEN nl.push_success = true THEN 1 END) as successful_notifications,
    COUNT(CASE WHEN nl.push_success = false THEN 1 END) as failed_notifications,
    COUNT(CASE WHEN nl.push_success IS NULL THEN 1 END) as pending_notifications,
    MIN(nl.created_at) as oldest_log,
    MAX(nl.created_at) as newest_log,
    COUNT(CASE WHEN nl.created_at < NOW() - INTERVAL '1 hour' THEN 1 END) as cleanable_logs,
    pg_size_pretty(pg_total_relation_size('notification_logs')) as table_size
FROM notification_logs nl
JOIN organizations o ON nl.organization_id = o.id
GROUP BY o.id, o.name;

-- 4. Function specifically for the admin dashboard
CREATE OR REPLACE FUNCTION get_notification_cleanup_recommendation()
RETURNS TABLE (
    total_logs integer,
    cleanable_successful integer,
    cleanable_failed integer,
    recommended_action text,
    space_savings_estimate text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_count integer;
    success_cleanable integer;
    failed_cleanable integer;
    action_text text;
    savings_text text;
BEGIN
    -- Get counts
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN push_success = true AND created_at < NOW() - INTERVAL '1 hour' THEN 1 END),
        COUNT(CASE WHEN push_success = false AND created_at < NOW() - INTERVAL '24 hours' THEN 1 END)
    INTO total_count, success_cleanable, failed_cleanable
    FROM notification_logs;
    
    -- Determine recommendation
    IF total_count > 5000 THEN
        action_text := 'URGENT: Run aggressive cleanup immediately';
        savings_text := 'Up to 80% space reduction possible';
    ELSIF total_count > 1000 THEN
        action_text := 'RECOMMENDED: Run standard cleanup';
        savings_text := 'Up to 60% space reduction possible';
    ELSIF success_cleanable + failed_cleanable > 100 THEN
        action_text := 'OPTIONAL: Light cleanup available';
        savings_text := 'Up to 30% space reduction possible';
    ELSE
        action_text := 'NO ACTION: Table size is optimal';
        savings_text := 'No cleanup needed';
    END IF;
    
    RETURN QUERY SELECT 
        total_count,
        success_cleanable,
        failed_cleanable,
        action_text,
        savings_text;
END;
$$;
