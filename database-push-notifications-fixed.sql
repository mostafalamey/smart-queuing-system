-- Push Notifications Database Schema (Fixed for your database structure)
-- Add this to your Supabase SQL editor

-- Table for storing push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure one subscription per phone per organization
    UNIQUE(organization_id, customer_phone, endpoint)
);

-- Table for notification preferences and fallback settings
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    push_enabled BOOLEAN DEFAULT true,
    push_denied BOOLEAN DEFAULT false,
    push_denied_at TIMESTAMP WITH TIME ZONE,
    whatsapp_fallback BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One preference record per customer per organization
    UNIQUE(organization_id, customer_phone)
);

-- Table for logging notification delivery status
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_phone VARCHAR(20) NOT NULL,
    ticket_number VARCHAR(10),
    notification_type VARCHAR(50) NOT NULL, -- 'ticket_created', 'almost_your_turn', 'your_turn'
    delivery_method VARCHAR(20) NOT NULL, -- 'push', 'whatsapp', 'both'
    push_success BOOLEAN,
    push_error TEXT,
    whatsapp_success BOOLEAN,
    whatsapp_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_org_phone ON public.push_subscriptions(organization_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON public.push_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_preferences_org_phone ON public.notification_preferences(organization_id, customer_phone);
CREATE INDEX IF NOT EXISTS idx_notification_logs_org_created ON public.notification_logs(organization_id, created_at);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Push subscriptions policies (FIXED to use your 'members' table)
CREATE POLICY "Users can insert their own subscriptions" ON public.push_subscriptions
    FOR INSERT WITH CHECK (true); -- Allow public insert for customer app

CREATE POLICY "Users can view subscriptions for their organization" ON public.push_subscriptions
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        organization_id IN (
            SELECT organization_id FROM public.members 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own subscriptions" ON public.push_subscriptions
    FOR UPDATE USING (
        auth.role() = 'service_role' OR 
        organization_id IN (
            SELECT organization_id FROM public.members 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Notification preferences policies (FIXED to use your 'members' table)
CREATE POLICY "Users can insert their own preferences" ON public.notification_preferences
    FOR INSERT WITH CHECK (true); -- Allow public insert for customer app

CREATE POLICY "Users can view preferences for their organization" ON public.notification_preferences
    FOR SELECT USING (
        auth.role() = 'service_role' OR 
        organization_id IN (
            SELECT organization_id FROM public.members 
            WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update preferences for their organization" ON public.notification_preferences
    FOR UPDATE USING (
        auth.role() = 'service_role' OR 
        organization_id IN (
            SELECT organization_id FROM public.members 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Notification logs policies (read-only for most users) (FIXED to use your 'members' table)
CREATE POLICY "Service role can manage notification logs" ON public.notification_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view logs for their organization" ON public.notification_logs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.members 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Functions for subscription management
CREATE OR REPLACE FUNCTION cleanup_old_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Deactivate subscriptions not used in 30 days
    UPDATE push_subscriptions 
    SET is_active = false 
    WHERE last_used_at < NOW() - INTERVAL '30 days' 
    AND is_active = true;
    
    -- Delete very old inactive subscriptions (90 days)
    DELETE FROM push_subscriptions 
    WHERE last_used_at < NOW() - INTERVAL '90 days' 
    AND is_active = false;
END;
$$;

-- Function to update subscription last used timestamp
CREATE OR REPLACE FUNCTION update_subscription_last_used(
    subscription_endpoint TEXT,
    organization_uuid UUID,
    phone_number VARCHAR(20)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE push_subscriptions 
    SET last_used_at = NOW() 
    WHERE endpoint = subscription_endpoint 
    AND organization_id = organization_uuid 
    AND customer_phone = phone_number;
END;
$$;

-- Function to get active subscriptions for an organization
CREATE OR REPLACE FUNCTION get_active_subscriptions(organization_uuid UUID)
RETURNS TABLE(
    id UUID,
    customer_phone VARCHAR(20),
    endpoint TEXT,
    p256dh_key TEXT,
    auth_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.customer_phone,
        ps.endpoint,
        ps.p256dh_key,
        ps.auth_key,
        ps.created_at
    FROM push_subscriptions ps
    WHERE ps.organization_id = organization_uuid 
    AND ps.is_active = true
    ORDER BY ps.created_at DESC;
END;
$$;

-- Optional: Add a scheduled cleanup task (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-subscriptions', '0 2 * * *', 'SELECT cleanup_old_subscriptions();');
