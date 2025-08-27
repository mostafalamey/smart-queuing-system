-- WhatsApp Inbound-First Integration Database Schema
-- This migration adds the necessary tables and indexes for WhatsApp session management

-- WhatsApp Sessions Table
-- Tracks active customer WhatsApp sessions (24-hour windows)
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  organization_id UUID REFERENCES organizations(id),
  ticket_id UUID REFERENCES tickets(id),
  customer_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inbound Messages Log
-- Stores all incoming WhatsApp messages from customers
CREATE TABLE IF NOT EXISTS whatsapp_inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  message_content TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id UUID REFERENCES whatsapp_sessions(id),
  webhook_data JSONB,
  processed BOOLEAN DEFAULT FALSE
);

-- Future: SMS Notification Tracking (for SMS fallback implementation)
-- Tracks SMS delivery for ultimate fallback notifications
CREATE TABLE IF NOT EXISTS sms_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) NOT NULL,
  message_content TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  ticket_id UUID REFERENCES tickets(id),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, delivered, failed
  provider_message_id VARCHAR(255),
  cost_cents INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced notification_logs for four-tier tracking
-- Add columns to existing notification_logs table for comprehensive tracking
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS sms_attempted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_success BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sms_error TEXT,
ADD COLUMN IF NOT EXISTS final_delivery_method VARCHAR(20); -- push, whatsapp, sms, none

-- Add WhatsApp number configuration to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT FALSE;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_active ON whatsapp_sessions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_org ON whatsapp_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_phone ON whatsapp_inbound_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_session ON whatsapp_inbound_messages(session_id);

-- Future SMS indexes
CREATE INDEX IF NOT EXISTS idx_sms_notifications_phone ON sms_notifications(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status ON sms_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_ticket ON sms_notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_org ON sms_notifications(organization_id);

-- Add helpful comments
COMMENT ON TABLE whatsapp_sessions IS 'Tracks active WhatsApp sessions for compliant messaging within 24-hour windows';
COMMENT ON TABLE whatsapp_inbound_messages IS 'Logs all incoming WhatsApp messages that initiate sessions';
COMMENT ON TABLE sms_notifications IS 'Future SMS fallback tracking for guaranteed delivery';

COMMENT ON COLUMN whatsapp_sessions.expires_at IS 'Session expiry time (24 hours from initiation)';
COMMENT ON COLUMN whatsapp_sessions.is_active IS 'Whether session is currently active and valid for messaging';
COMMENT ON COLUMN sms_notifications.cost_cents IS 'SMS cost in cents for billing and analytics';
COMMENT ON COLUMN notification_logs.final_delivery_method IS 'Which method ultimately delivered the notification';
