-- Admin Interface Support for Notification Logs Management
-- Creates functions and views to support an admin interface for managing notification logs

-- 1. Enhanced view for admin dashboard with detailed statistics
CREATE OR REPLACE VIEW notification_logs_dashboard AS
SELECT 
    nl.organization_id,
    o.name as organization_name,
    nl.notification_type,
    nl.delivery_method,
    COUNT(*) as total_count,
    COUNT(CASE WHEN nl.push_success = true THEN 1 END) as successful_count,
    COUNT(CASE WHEN nl.push_success = false THEN 1 END) as failed_count,
    COUNT(CASE WHEN nl.push_success IS NULL THEN 1 END) as pending_count,
    MIN(nl.created_at) as oldest_log,
    MAX(nl.created_at) as newest_log,
    AVG(EXTRACT(EPOCH FROM (NOW() - nl.created_at))/3600) as avg_age_hours,
    -- Cleanable counts
    COUNT(CASE WHEN nl.push_success = true AND nl.created_at < NOW() - INTERVAL '1 hour' THEN 1 END) as cleanable_successful,
    COUNT(CASE WHEN nl.push_success = false AND nl.created_at < NOW() - INTERVAL '24 hours' THEN 1 END) as cleanable_failed,
    -- Size estimates  
    COUNT(*) * 1024 as estimated_size_bytes -- Rough estimate
FROM notification_logs nl
JOIN organizations o ON nl.organization_id = o.id
GROUP BY nl.organization_id, o.name, nl.notification_type, nl.delivery_method
ORDER BY total_count DESC;

-- 2. Functions for selective cleanup by organization
CREATE OR REPLACE FUNCTION cleanup_organization_notifications(
    org_id uuid,
    cleanup_successful boolean DEFAULT true,
    cleanup_failed boolean DEFAULT false,
    max_age_hours integer DEFAULT 1
)
RETURNS TABLE (
    organization_name text,
    successful_deleted integer,
    failed_deleted integer,
    total_deleted integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    success_count integer := 0;
    failed_count integer := 0;
    org_name text;
BEGIN
    -- Get organization name
    SELECT name INTO org_name FROM organizations WHERE id = org_id;
    
    -- Clean successful notifications if requested
    IF cleanup_successful THEN
        DELETE FROM notification_logs 
        WHERE organization_id = org_id
        AND push_success = true 
        AND created_at < NOW() - (max_age_hours || ' hours')::INTERVAL;
        
        GET DIAGNOSTICS success_count = ROW_COUNT;
    END IF;
    
    -- Clean failed notifications if requested  
    IF cleanup_failed THEN
        DELETE FROM notification_logs 
        WHERE organization_id = org_id
        AND push_success = false
        AND created_at < NOW() - (max_age_hours || ' hours')::INTERVAL;
        
        GET DIAGNOSTICS failed_count = ROW_COUNT;
    END IF;
    
    RETURN QUERY SELECT 
        org_name,
        success_count,
        failed_count,
        (success_count + failed_count);
END;
$$;

-- 3. Function for emergency cleanup (admin panic button)
CREATE OR REPLACE FUNCTION emergency_cleanup_all_notifications(
    confirm_deletion boolean DEFAULT false
)
RETURNS TABLE (
    total_deleted integer,
    organizations_affected integer,
    cleanup_timestamp timestamp with time zone,
    warning_message text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer := 0;
    org_count integer := 0;
    warning_msg text;
BEGIN
    IF NOT confirm_deletion THEN
        warning_msg := 'SAFETY CHECK: Set confirm_deletion = true to proceed with emergency cleanup';
        RETURN QUERY SELECT 0, 0, NOW(), warning_msg;
        RETURN;
    END IF;
    
    -- Count organizations that will be affected
    SELECT COUNT(DISTINCT organization_id) INTO org_count FROM notification_logs;
    
    -- Emergency cleanup - delete ALL notification logs
    DELETE FROM notification_logs;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    warning_msg := 'EMERGENCY CLEANUP COMPLETED - All notification logs deleted';
    
    -- Log the emergency cleanup
    INSERT INTO ticket_cleanup_stats (
        organization_id,
        cleanup_type,
        total_processed,
        details,
        created_at
    ) VALUES (
        'system'::uuid,
        'emergency_notification_cleanup',
        deleted_count,
        jsonb_build_object(
            'warning', 'Emergency cleanup performed',
            'organizations_affected', org_count,
            'deleted_count', deleted_count
        ),
        NOW()
    );
    
    RETURN QUERY SELECT 
        deleted_count,
        org_count,
        NOW(),
        warning_msg;
END;
$$;

-- 4. Function to get cleanup recommendations per organization
CREATE OR REPLACE FUNCTION get_organization_cleanup_recommendations()
RETURNS TABLE (
    organization_id uuid,
    organization_name text,
    total_logs integer,
    successful_cleanable integer,
    failed_cleanable integer,
    recommendation text,
    priority_level text,
    estimated_savings_kb integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH org_stats AS (
        SELECT 
            nl.organization_id,
            o.name as org_name,
            COUNT(*) as total_count,
            COUNT(CASE WHEN nl.push_success = true AND nl.created_at < NOW() - INTERVAL '1 hour' THEN 1 END) as success_cleanable,
            COUNT(CASE WHEN nl.push_success = false AND nl.created_at < NOW() - INTERVAL '24 hours' THEN 1 END) as failed_cleanable
        FROM notification_logs nl
        JOIN organizations o ON nl.organization_id = o.id
        GROUP BY nl.organization_id, o.name
    )
    SELECT 
        s.organization_id,
        s.org_name,
        s.total_count,
        s.success_cleanable,
        s.failed_cleanable,
        CASE 
            WHEN s.total_count > 2000 THEN 'Urgent cleanup recommended - high volume'
            WHEN s.success_cleanable + s.failed_cleanable > 500 THEN 'Cleanup recommended - moderate savings'
            WHEN s.success_cleanable + s.failed_cleanable > 100 THEN 'Light cleanup available'
            ELSE 'No cleanup needed'
        END as recommendation,
        CASE 
            WHEN s.total_count > 2000 THEN 'HIGH'
            WHEN s.success_cleanable + s.failed_cleanable > 500 THEN 'MEDIUM'
            WHEN s.success_cleanable + s.failed_cleanable > 100 THEN 'LOW'
            ELSE 'NONE'
        END as priority_level,
        ((s.success_cleanable + s.failed_cleanable) * 1)::integer as estimated_savings_kb -- 1KB per log estimate
    FROM org_stats s
    ORDER BY s.total_count DESC;
END;
$$;

-- 5. Function for safe bulk cleanup with confirmation
CREATE OR REPLACE FUNCTION safe_bulk_cleanup_notifications(
    organization_ids uuid[] DEFAULT NULL,
    dry_run boolean DEFAULT true,
    cleanup_successful boolean DEFAULT true,
    cleanup_failed_older_than_hours integer DEFAULT 24
)
RETURNS TABLE (
    organization_name text,
    would_delete_successful integer,
    would_delete_failed integer,
    total_would_delete integer,
    action_taken text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id uuid;
    success_count integer;
    failed_count integer;
    org_name text;
    action_msg text;
BEGIN
    -- If no specific organizations provided, process all
    IF organization_ids IS NULL THEN
        organization_ids := ARRAY(SELECT id FROM organizations);
    END IF;
    
    -- Process each organization
    FOREACH org_id IN ARRAY organization_ids
    LOOP
        SELECT name INTO org_name FROM organizations WHERE id = org_id;
        
        -- Count what would be deleted
        SELECT COUNT(*) INTO success_count
        FROM notification_logs 
        WHERE organization_id = org_id
        AND push_success = true 
        AND created_at < NOW() - INTERVAL '1 hour';
        
        SELECT COUNT(*) INTO failed_count
        FROM notification_logs 
        WHERE organization_id = org_id
        AND push_success = false
        AND created_at < NOW() - (cleanup_failed_older_than_hours || ' hours')::INTERVAL;
        
        IF dry_run THEN
            action_msg := 'DRY RUN - No data deleted';
        ELSE
            -- Perform actual cleanup
            IF cleanup_successful THEN
                DELETE FROM notification_logs 
                WHERE organization_id = org_id
                AND push_success = true 
                AND created_at < NOW() - INTERVAL '1 hour';
            END IF;
            
            DELETE FROM notification_logs 
            WHERE organization_id = org_id
            AND push_success = false
            AND created_at < NOW() - (cleanup_failed_older_than_hours || ' hours')::INTERVAL;
            
            action_msg := 'CLEANUP PERFORMED';
        END IF;
        
        RETURN QUERY SELECT 
            org_name,
            CASE WHEN cleanup_successful THEN success_count ELSE 0 END,
            failed_count,
            CASE WHEN cleanup_successful THEN success_count + failed_count ELSE failed_count END,
            action_msg;
    END LOOP;
END;
$$;
