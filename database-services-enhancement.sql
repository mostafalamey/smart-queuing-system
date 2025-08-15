-- Services Layer Enhancement for Smart Queue System
-- Add this to your Supabase SQL editor to add Services functionality

-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    service_code VARCHAR(10) NOT NULL, -- Unique code within department (e.g., "SV01", "SV02")
    estimated_duration INTEGER DEFAULT 15, -- Estimated service time in minutes
    max_daily_capacity INTEGER, -- Optional daily capacity limit
    is_active BOOLEAN DEFAULT true,
    priority_weight INTEGER DEFAULT 1, -- For service prioritization
    color_code VARCHAR(7), -- Hex color code for UI display (#FF5733)
    icon_name VARCHAR(50), -- Icon identifier for UI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique service codes within each department
    UNIQUE(department_id, service_code),
    
    -- Ensure service names are unique within each department
    UNIQUE(department_id, name)
);

-- Create service_queue_settings table (replaces department-level queue_settings)
CREATE TABLE IF NOT EXISTS public.service_queue_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    current_serving VARCHAR(20), -- Current ticket being served (e.g., "SV01-001")
    last_ticket_number INTEGER DEFAULT 0, -- Last issued ticket number for this service
    daily_tickets_count INTEGER DEFAULT 0, -- Tickets issued today
    last_reset_date DATE DEFAULT CURRENT_DATE, -- For daily ticket counter reset
    is_service_active BOOLEAN DEFAULT true, -- Can temporarily pause service
    average_service_time INTEGER DEFAULT 15, -- Calculated average in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One queue setting per service
    UNIQUE(service_id)
);

-- Add service_id to tickets table (maintain department_id for backward compatibility)
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_services_department_active ON public.services(department_id, is_active);
CREATE INDEX IF NOT EXISTS idx_services_code ON public.services(service_code);
CREATE INDEX IF NOT EXISTS idx_service_queue_settings_service ON public.service_queue_settings(service_id);
CREATE INDEX IF NOT EXISTS idx_tickets_service_id ON public.tickets(service_id);
CREATE INDEX IF NOT EXISTS idx_tickets_service_status ON public.tickets(service_id, status);

-- Create service_analytics table for reporting
CREATE TABLE IF NOT EXISTS public.service_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_tickets INTEGER DEFAULT 0,
    served_tickets INTEGER DEFAULT 0,
    average_wait_time INTEGER DEFAULT 0, -- in minutes
    average_service_time INTEGER DEFAULT 0, -- in minutes
    peak_hour INTEGER, -- Hour with most tickets (0-23)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One record per service per date
    UNIQUE(service_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_queue_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for services table
CREATE POLICY "Users can view services for their organization" ON public.services
    FOR SELECT USING (
        department_id IN (
            SELECT d.id FROM public.departments d
            JOIN public.branches b ON d.branch_id = b.id
            JOIN public.members m ON b.organization_id = m.organization_id
            WHERE m.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert services" ON public.services
    FOR INSERT WITH CHECK (
        department_id IN (
            SELECT d.id FROM public.departments d
            JOIN public.branches b ON d.branch_id = b.id
            JOIN public.members m ON b.organization_id = m.organization_id
            WHERE m.auth_user_id = auth.uid() AND m.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can update services" ON public.services
    FOR UPDATE USING (
        department_id IN (
            SELECT d.id FROM public.departments d
            JOIN public.branches b ON d.branch_id = b.id
            JOIN public.members m ON b.organization_id = m.organization_id
            WHERE m.auth_user_id = auth.uid() AND m.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Admins can delete services" ON public.services
    FOR DELETE USING (
        department_id IN (
            SELECT d.id FROM public.departments d
            JOIN public.branches b ON d.branch_id = b.id
            JOIN public.members m ON b.organization_id = m.organization_id
            WHERE m.auth_user_id = auth.uid() AND m.role IN ('admin', 'manager')
        )
    );

-- RLS Policies for service_queue_settings
CREATE POLICY "Users can view service queue settings for their organization" ON public.service_queue_settings
    FOR SELECT USING (
        service_id IN (
            SELECT s.id FROM public.services s
            JOIN public.departments d ON s.department_id = d.id
            JOIN public.branches b ON d.branch_id = b.id
            JOIN public.members m ON b.organization_id = m.organization_id
            WHERE m.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "Users can modify service queue settings for their organization" ON public.service_queue_settings
    FOR ALL USING (
        service_id IN (
            SELECT s.id FROM public.services s
            JOIN public.departments d ON s.department_id = d.id
            JOIN public.branches b ON d.branch_id = b.id
            JOIN public.members m ON b.organization_id = m.organization_id
            WHERE m.auth_user_id = auth.uid()
        )
    );

-- RLS Policies for service_analytics
CREATE POLICY "Users can view service analytics for their organization" ON public.service_analytics
    FOR SELECT USING (
        service_id IN (
            SELECT s.id FROM public.services s
            JOIN public.departments d ON s.department_id = d.id
            JOIN public.branches b ON d.branch_id = b.id
            JOIN public.members m ON b.organization_id = m.organization_id
            WHERE m.auth_user_id = auth.uid()
        )
    );

-- Allow anonymous access for customer app (services selection)
CREATE POLICY "Anonymous users can view active services" ON public.services
    FOR SELECT USING (is_active = true);

-- Allow anonymous access to queue settings for customer app
CREATE POLICY "Anonymous users can view service queue settings" ON public.service_queue_settings
    FOR SELECT USING (is_service_active = true);

-- Create function to automatically create queue settings when a new service is added
CREATE OR REPLACE FUNCTION create_service_queue_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.service_queue_settings (service_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create queue settings
DROP TRIGGER IF EXISTS trigger_create_service_queue_settings ON public.services;
CREATE TRIGGER trigger_create_service_queue_settings
    AFTER INSERT ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION create_service_queue_settings();

-- Create function to generate service-specific ticket numbers
CREATE OR REPLACE FUNCTION generate_service_ticket_number(service_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    service_code TEXT;
    next_number INTEGER;
    ticket_number TEXT;
BEGIN
    -- Get service code and increment ticket counter
    UPDATE public.service_queue_settings 
    SET last_ticket_number = last_ticket_number + 1,
        updated_at = NOW()
    WHERE service_id = service_uuid
    RETURNING last_ticket_number INTO next_number;
    
    -- Get service code
    SELECT s.service_code INTO service_code
    FROM public.services s
    WHERE s.id = service_uuid;
    
    -- Format ticket number (e.g., "SV01-001")
    ticket_number := service_code || '-' || LPAD(next_number::TEXT, 3, '0');
    
    RETURN ticket_number;
END;
$$ LANGUAGE plpgsql;

-- Create function to update service analytics daily
CREATE OR REPLACE FUNCTION update_service_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert analytics for the service
    INSERT INTO public.service_analytics (service_id, date, total_tickets, served_tickets)
    VALUES (NEW.service_id, CURRENT_DATE, 1, 
            CASE WHEN NEW.status = 'served' THEN 1 ELSE 0 END)
    ON CONFLICT (service_id, date)
    DO UPDATE SET
        total_tickets = service_analytics.total_tickets + 1,
        served_tickets = service_analytics.served_tickets + 
                        CASE WHEN NEW.status = 'served' THEN 1 ELSE 0 END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for analytics updates
DROP TRIGGER IF EXISTS trigger_update_service_analytics ON public.tickets;
CREATE TRIGGER trigger_update_service_analytics
    AFTER INSERT OR UPDATE ON public.tickets
    FOR EACH ROW
    WHEN (NEW.service_id IS NOT NULL)
    EXECUTE FUNCTION update_service_analytics();

-- Migration function to create default services for existing departments
DO $$
DECLARE
    dept RECORD;
    service_id UUID;
BEGIN
    -- Only run if no services exist yet
    IF NOT EXISTS (SELECT 1 FROM public.services LIMIT 1) THEN
        FOR dept IN SELECT id, name FROM public.departments WHERE is_active = true
        LOOP
            -- Create a default "General Service" for each department
            INSERT INTO public.services (
                department_id, 
                name, 
                description, 
                service_code,
                estimated_duration,
                is_active
            ) VALUES (
                dept.id,
                'General Service',
                'Standard service for ' || dept.name,
                'GEN',
                15,
                true
            ) RETURNING id INTO service_id;
            
            -- The trigger will automatically create queue_settings
            
            RAISE NOTICE 'Created default service for department: %', dept.name;
        END LOOP;
    END IF;
END $$;

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers for new tables
CREATE TRIGGER trigger_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_service_queue_settings_updated_at
    BEFORE UPDATE ON public.service_queue_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_service_analytics_updated_at
    BEFORE UPDATE ON public.service_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for easy service hierarchy querying
CREATE OR REPLACE VIEW public.service_hierarchy AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    b.id as branch_id,
    b.name as branch_name,
    d.id as department_id,
    d.name as department_name,
    s.id as service_id,
    s.name as service_name,
    s.service_code,
    s.description as service_description,
    s.estimated_duration,
    s.is_active as service_active,
    sqs.current_serving,
    sqs.last_ticket_number,
    sqs.is_service_active,
    COUNT(t.id) as waiting_tickets
FROM public.organizations o
JOIN public.branches b ON o.id = b.organization_id
JOIN public.departments d ON b.id = d.branch_id
JOIN public.services s ON d.id = s.department_id
LEFT JOIN public.service_queue_settings sqs ON s.id = sqs.service_id
LEFT JOIN public.tickets t ON s.id = t.service_id AND t.status = 'waiting'
GROUP BY o.id, o.name, b.id, b.name, d.id, d.name, s.id, s.name, 
         s.service_code, s.description, s.estimated_duration, s.is_active,
         sqs.current_serving, sqs.last_ticket_number, sqs.is_service_active;

COMMENT ON TABLE public.services IS 'Services offered under departments - the lowest level in the hierarchy';
COMMENT ON TABLE public.service_queue_settings IS 'Queue management settings specific to each service';
COMMENT ON TABLE public.service_analytics IS 'Daily analytics and metrics for each service';
COMMENT ON VIEW public.service_hierarchy IS 'Complete organizational hierarchy view with queue status';
