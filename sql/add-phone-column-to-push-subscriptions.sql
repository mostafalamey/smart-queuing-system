-- Migration: Add customer_phone column to push_subscriptions table
-- This enables phone-number-based push subscription management

-- Step 1: Add customer_phone column to push_subscriptions table
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Step 2: Make ticket_id nullable to support phone-based subscriptions
ALTER TABLE push_subscriptions 
ALTER COLUMN ticket_id DROP NOT NULL;

-- Step 3: Create index for fast phone number lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_phone 
ON push_subscriptions(organization_id, customer_phone, is_active);

-- Step 4: Create index for legacy ticket-based lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_ticket 
ON push_subscriptions(organization_id, ticket_id, is_active);

-- Step 5: Update notification_preferences to support phone-based preferences
ALTER TABLE notification_preferences 
ALTER COLUMN ticket_id DROP NOT NULL;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN push_subscriptions.customer_phone IS 'Customer phone number for phone-based subscription management';
COMMENT ON COLUMN push_subscriptions.ticket_id IS 'Optional ticket ID - can be NULL for phone-based subscriptions';
COMMENT ON COLUMN notification_preferences.ticket_id IS 'Optional ticket ID - can be NULL for phone-based preferences';

-- Step 7: Add a constraint to ensure either phone or ticket_id is provided
ALTER TABLE push_subscriptions 
ADD CONSTRAINT check_phone_or_ticket 
CHECK (customer_phone IS NOT NULL OR ticket_id IS NOT NULL);
