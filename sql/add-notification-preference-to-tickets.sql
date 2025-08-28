-- Add notification preference column to tickets table
-- This will allow the admin API to know what notification types the user wants

-- Add the notification_preference column
ALTER TABLE public.tickets 
ADD COLUMN notification_preference TEXT DEFAULT 'push' 
CHECK (notification_preference IN ('push', 'whatsapp', 'both'));

-- Add a comment to document the column
COMMENT ON COLUMN public.tickets.notification_preference IS 
'User preference for notifications: push (push only), whatsapp (whatsapp only), both (push and whatsapp)';

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_tickets_notification_preference 
ON public.tickets(notification_preference);
