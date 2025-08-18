-- Notification Logs Batch Cleanup System
-- This approach keeps logs for configurable periods then cleans in batches

-- 1. Enhanced notification logs cleanup with flexible retention periods
CREATE OR REPLACE FUNCTION batch_cleanup_notification_logs(
    successful_retention_hours integer DEFAULT 1,    -- Keep successful for 1 hour
    failed_retention_days integer DEFAULT 3,         -- Keep failed for 3 days  
    archive_before_delete boolean DEFAULT false,     -- Optional archival
    batch_size integer DEFAULT 1000                  -- Process in batches
)
RETURNS TABLE (
    total_processed integer,
    successful_deleted integer,
    failed_deleted integer,
    archived_count integer,
    cleanup_duration interval
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    start_time timestamp := NOW();
    success_deleted integer := 0;
    fail_deleted integer := 0;
    archived integer := 0;
    total_count integer := 0;
BEGIN
    -- Optional: Archive old logs before deletion
    IF archive_before_delete THEN
        -- Create archive table if it doesn't exist
        CREATE TABLE IF NOT EXISTS notification_logs_archive (
            LIKE notification_logs INCLUDING ALL,
            archived_at timestamp with time zone DEFAULT NOW()
        );
        
        -- Archive old logs
        INSERT INTO notification_logs_archive 
        SELECT *, NOW() FROM notification_logs 
        WHERE created_at < NOW() - (failed_retention_days || ' days')::INTERVAL
        LIMIT batch_size;
        
        GET DIAGNOSTICS archived = ROW_COUNT;
    END IF;
    
    -- Delete successful notifications older than retention period
    DELETE FROM notification_logs 
    WHERE push_success = true 
    AND created_at < NOW() - (successful_retention_hours || ' hours')::INTERVAL
    AND id IN (
        SELECT id FROM notification_logs 
        WHERE push_success = true 
        AND created_at < NOW() - (successful_retention_hours || ' hours')::INTERVAL
        LIMIT batch_size
    );
    
    GET DIAGNOSTICS success_deleted = ROW_COUNT;
    
    -- Delete failed notifications older than retention period
    DELETE FROM notification_logs 
    WHERE (push_success = false OR push_success IS NULL)
    AND created_at < NOW() - (failed_retention_days || ' days')::INTERVAL
    AND id IN (
        SELECT id FROM notification_logs 
        WHERE (push_success = false OR push_success IS NULL)
        AND created_at < NOW() - (failed_retention_days || ' days')::INTERVAL
        LIMIT batch_size
    );
    
    GET DIAGNOSTICS fail_deleted = ROW_COUNT;
    
    total_count := success_deleted + fail_deleted;
    
    -- Log cleanup statistics
    IF total_count > 0 THEN
        INSERT INTO ticket_cleanup_stats (
            organization_id,
            cleanup_type,
            total_processed,
            created_at
        ) 
        SELECT 
            'system'::uuid, -- System-wide cleanup
            'notification_logs_batch',
            total_count,
            NOW();
    END IF;
    
    RETURN QUERY SELECT 
        total_count,
        success_deleted,
        fail_deleted,
        archived,
        (NOW() - start_time);
END;
$$;

-- 2. Progressive cleanup based on table size
CREATE OR REPLACE FUNCTION progressive_notification_cleanup()
RETURNS TABLE (
    table_size_mb numeric,
    records_before integer,
    records_after integer,
    cleanup_action text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    table_size numeric;
    record_count integer;
    records_before integer;
    cleanup_result text;
BEGIN
    -- Get current table size and record count
    SELECT 
        pg_size_pretty(pg_total_relation_size('notification_logs'))::text::numeric,
        COUNT(*)
    INTO table_size, record_count
    FROM notification_logs;
    
    records_before := record_count;
    
    -- Progressive cleanup based on size
    IF record_count > 10000 THEN
        -- Aggressive cleanup for large tables
        PERFORM batch_cleanup_notification_logs(0, 1, false, 2000); -- Keep nothing, batch size 2000
        cleanup_result := 'Aggressive cleanup (>10k records)';
        
    ELSIF record_count > 5000 THEN
        -- Moderate cleanup
        PERFORM batch_cleanup_notification_logs(1, 2, false, 1000); -- 1 hour, 2 days
        cleanup_result := 'Moderate cleanup (>5k records)';
        
    ELSIF record_count > 1000 THEN
        -- Light cleanup
        PERFORM batch_cleanup_notification_logs(6, 3, false, 500); -- 6 hours, 3 days
        cleanup_result := 'Light cleanup (>1k records)';
        
    ELSE
        cleanup_result := 'No cleanup needed (<1k records)';
    END IF;
    
    -- Get new record count
    SELECT COUNT(*) INTO record_count FROM notification_logs;
    
    RETURN QUERY SELECT 
        table_size,
        records_before,
        record_count,
        cleanup_result;
END;
$$;

-- 3. Smart cleanup based on notification patterns
CREATE OR REPLACE FUNCTION smart_notification_cleanup()
RETURNS TABLE (
    organization_name text,
    total_logs integer,
    successful_cleaned integer,
    failed_kept integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH cleanup_results AS (
        SELECT 
            o.name as org_name,
            COUNT(nl.*) as total_count,
            COUNT(CASE WHEN nl.push_success = true THEN 1 END) as success_count,
            COUNT(CASE WHEN nl.push_success = false THEN 1 END) as fail_count
        FROM notification_logs nl
        JOIN organizations o ON nl.organization_id = o.id
        WHERE nl.created_at < NOW() - INTERVAL '1 hour'
        GROUP BY o.id, o.name
    ),
    deletion_results AS (
        -- Delete successful notifications older than 1 hour per organization
        DELETE FROM notification_logs 
        WHERE push_success = true 
        AND created_at < NOW() - INTERVAL '1 hour'
        RETURNING organization_id
    )
    SELECT 
        cr.org_name,
        cr.total_count,
        cr.success_count,
        cr.fail_count
    FROM cleanup_results cr;
END;
$$;
