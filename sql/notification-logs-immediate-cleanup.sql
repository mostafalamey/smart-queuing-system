-- Notification Logs Immediate Cleanup System
-- This approach deletes notification logs immediately after successful delivery

-- 1. Create function to clean up notification logs after successful delivery
CREATE OR REPLACE FUNCTION cleanup_successful_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer := 0;
BEGIN
    -- Delete successful push notifications (no need to keep once delivered)
    DELETE FROM notification_logs 
    WHERE delivery_method = 'push' 
    AND push_success = true 
    AND created_at < NOW() - INTERVAL '5 minutes'; -- Small delay to ensure delivery confirmation
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO ticket_cleanup_stats (
        organization_id,
        cleanup_type,
        total_processed,
        created_at
    ) 
    SELECT 
        organization_id,
        'notification_logs_cleanup',
        deleted_count,
        NOW()
    FROM organizations 
    WHERE deleted_count > 0
    LIMIT 1;
    
    RETURN deleted_count;
END;
$$;

-- 2. Function to clean up old failed notifications (keep errors for debugging)
CREATE OR REPLACE FUNCTION cleanup_old_failed_notifications(
    days_old integer DEFAULT 7
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer := 0;
BEGIN
    -- Keep failed notifications for debugging, but delete after a week
    DELETE FROM notification_logs 
    WHERE (push_success = false OR whatsapp_success = false)
    AND created_at < NOW() - (days_old || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- 3. Comprehensive cleanup function
CREATE OR REPLACE FUNCTION cleanup_notification_logs(
    keep_successful_minutes integer DEFAULT 5,
    keep_failed_days integer DEFAULT 7
)
RETURNS TABLE (
    successful_cleaned integer,
    failed_cleaned integer,
    total_cleaned integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    success_count integer := 0;
    failed_count integer := 0;
BEGIN
    -- Clean successful notifications (no need to keep once delivered)
    DELETE FROM notification_logs 
    WHERE push_success = true 
    AND created_at < NOW() - (keep_successful_minutes || ' minutes')::INTERVAL;
    
    GET DIAGNOSTICS success_count = ROW_COUNT;
    
    -- Clean old failed notifications (keep for debugging period)
    DELETE FROM notification_logs 
    WHERE (push_success = false OR whatsapp_success = false OR push_success IS NULL)
    AND created_at < NOW() - (keep_failed_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS failed_count = ROW_COUNT;
    
    RETURN QUERY SELECT success_count, failed_count, (success_count + failed_count);
END;
$$;

-- 4. Automated cleanup trigger (alternative to manual calls)
CREATE OR REPLACE FUNCTION trigger_cleanup_notification_logs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_count integer;
BEGIN
    -- Check if we have too many logs (cleanup every 1000 new logs)
    SELECT COUNT(*) INTO log_count FROM notification_logs;
    
    IF log_count > 1000 THEN
        PERFORM cleanup_notification_logs();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger to auto-cleanup when logs get too many
-- DROP TRIGGER IF EXISTS auto_cleanup_notification_logs ON notification_logs;
-- CREATE TRIGGER auto_cleanup_notification_logs
--     AFTER INSERT ON notification_logs
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION trigger_cleanup_notification_logs();
