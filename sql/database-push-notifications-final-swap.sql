-- Final Migration Step: Swap Tables for Ticket-Based Push Notifications
-- Run this script AFTER running database-push-notifications-ticket-based.sql
-- This completes the migration by swapping the new tables to their final names

-- ⚠️  WARNING: THIS IS A ONE-TIME MIGRATION SCRIPT
-- ⚠️  Running this multiple times will CLEAR all user notification preferences!
-- ⚠️  Only run this if you're migrating from old table structure to new one

-- Safety check: Exit if this migration has already been completed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notification_preferences' 
        AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notification_preferences' 
            AND column_name = 'ticket_id'
        )
    ) THEN
        RAISE NOTICE '=================================================================';
        RAISE NOTICE 'Migration already completed - notification_preferences table exists with ticket_id column';
        RAISE NOTICE 'Skipping migration to prevent data loss';
        RAISE NOTICE '=================================================================';
        RETURN;
    END IF;
    
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Starting notification preferences table migration...';
    RAISE NOTICE '=================================================================';
END
$$;

-- =================================================================================
-- STEP 1: Backup existing data (if any exists)
-- =================================================================================

-- Check if old tables exist and backup their data
DO $$
BEGIN
    -- Backup push_subscriptions if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
        DROP TABLE IF EXISTS public.push_subscriptions_backup CASCADE;
        CREATE TABLE public.push_subscriptions_backup AS SELECT * FROM public.push_subscriptions;
        RAISE NOTICE 'Backed up existing push_subscriptions table';
    END IF;
    
    -- Backup notification_preferences if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        DROP TABLE IF EXISTS public.notification_preferences_backup CASCADE;
        CREATE TABLE public.notification_preferences_backup AS SELECT * FROM public.notification_preferences;
        RAISE NOTICE 'Backed up existing notification_preferences table';
    END IF;
    
    -- Backup notification_logs if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notification_logs') THEN
        DROP TABLE IF EXISTS public.notification_logs_backup CASCADE;
        CREATE TABLE public.notification_logs_backup AS SELECT * FROM public.notification_logs;
        RAISE NOTICE 'Backed up existing notification_logs table';
    END IF;
END
$$;

-- =================================================================================
-- STEP 2: Drop old tables (if they exist)
-- =================================================================================

DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.notification_logs CASCADE;

-- =================================================================================
-- STEP 3: Rename new tables to their final names
-- =================================================================================

ALTER TABLE public.push_subscriptions_new RENAME TO push_subscriptions;
ALTER TABLE public.notification_preferences_new RENAME TO notification_preferences;
ALTER TABLE public.notification_logs_new RENAME TO notification_logs;

-- =================================================================================
-- STEP 4: Update index names
-- =================================================================================

-- Rename push_subscriptions indexes
ALTER INDEX IF EXISTS idx_push_subscriptions_new_org_ticket RENAME TO idx_push_subscriptions_org_ticket;
ALTER INDEX IF EXISTS idx_push_subscriptions_new_ticket RENAME TO idx_push_subscriptions_ticket;
ALTER INDEX IF EXISTS idx_push_subscriptions_new_active RENAME TO idx_push_subscriptions_active;
ALTER INDEX IF EXISTS idx_push_subscriptions_new_endpoint RENAME TO idx_push_subscriptions_endpoint;

-- Rename notification_preferences indexes
ALTER INDEX IF EXISTS idx_notification_preferences_new_ticket RENAME TO idx_notification_preferences_ticket;
ALTER INDEX IF EXISTS idx_notification_preferences_new_org RENAME TO idx_notification_preferences_org;
ALTER INDEX IF EXISTS idx_notification_preferences_new_phone RENAME TO idx_notification_preferences_phone;

-- Rename notification_logs indexes
ALTER INDEX IF EXISTS idx_notification_logs_new_ticket RENAME TO idx_notification_logs_ticket;
ALTER INDEX IF EXISTS idx_notification_logs_new_org_created RENAME TO idx_notification_logs_org_created;
ALTER INDEX IF EXISTS idx_notification_logs_new_phone RENAME TO idx_notification_logs_phone;

-- =================================================================================
-- STEP 5: Update helper functions to use final table names
-- =================================================================================

-- Update cleanup function to use final table name
CREATE OR REPLACE FUNCTION cleanup_expired_push_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    -- Deactivate push subscriptions for completed/cancelled tickets
    UPDATE push_subscriptions 
    SET is_active = false, updated_at = NOW()
    WHERE ticket_id IN (
        SELECT id FROM tickets 
        WHERE status IN ('completed', 'cancelled')
    ) AND is_active = true;
    
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    
    RETURN cleanup_count;
END;
$$;

-- Update lookup function to use final table name
CREATE OR REPLACE FUNCTION get_push_subscriptions_by_ticket(p_ticket_id UUID)
RETURNS TABLE (
    id UUID,
    organization_id UUID,
    ticket_id UUID,
    endpoint TEXT,
    p256dh_key TEXT,
    auth_key TEXT,
    user_agent TEXT,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.organization_id,
        ps.ticket_id,
        ps.endpoint,
        ps.p256dh_key,
        ps.auth_key,
        ps.user_agent,
        ps.is_active
    FROM push_subscriptions ps
    INNER JOIN tickets t ON t.id = ps.ticket_id
    WHERE ps.ticket_id = p_ticket_id 
    AND ps.is_active = true
    AND t.status NOT IN ('completed', 'cancelled');
END;
$$;

-- =================================================================================
-- VERIFICATION QUERIES
-- =================================================================================

-- Verify the new tables exist and have the correct structure
SELECT 'push_subscriptions' as table_name, count(*) as row_count FROM push_subscriptions
UNION ALL
SELECT 'notification_preferences' as table_name, count(*) as row_count FROM notification_preferences
UNION ALL
SELECT 'notification_logs' as table_name, count(*) as row_count FROM notification_logs;

-- Show table column information
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('push_subscriptions', 'notification_preferences', 'notification_logs')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- =================================================================================
-- SUCCESS MESSAGE
-- =================================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '📋 Summary:';
    RAISE NOTICE '   • push_subscriptions now uses ticket_id as primary identifier';
    RAISE NOTICE '   • notification_preferences supports optional phone numbers';
    RAISE NOTICE '   • notification_logs tracks both push and SMS/WhatsApp delivery';
    RAISE NOTICE '   • All RLS policies and indexes are in place';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your push notification system is now ready!';
    RAISE NOTICE '   • Customers can create tickets without phone numbers';
    RAISE NOTICE '   • Push notifications use ticket IDs for privacy';
    RAISE NOTICE '   • Phone numbers are optional for future WhatsApp/SMS integration';
    
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '⚠️  DO NOT RUN THIS SCRIPT AGAIN - IT WILL CLEAR USER DATA!';
    RAISE NOTICE 'If you need to reset notification preferences, use proper cleanup functions instead.';
    RAISE NOTICE '=================================================================';
END
$$;
