-- Services Table Creation Script
-- Run this in your Supabase SQL Editor

-- Step 1: Create the services table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_time INTEGER DEFAULT 30, -- Time in minutes
    is_active BOOLEAN DEFAULT true,
    color VARCHAR(7) DEFAULT '#F59E0B', -- Hex color
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure service names are unique within each department
    UNIQUE(department_id, name)
);

-- Step 2: Add service_id to tickets table (optional - for future use)
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_department_active ON public.services(department_id, is_active);

-- Step 4: Insert sample services (optional)
-- You can uncomment and modify these after creating some departments

/*
-- Sample services for testing (replace with your actual department IDs)
INSERT INTO public.services (department_id, name, description, estimated_time, color) VALUES
('YOUR_DEPARTMENT_ID_1', 'Customer Support', 'General customer support service', 15, '#3B82F6'),
('YOUR_DEPARTMENT_ID_1', 'Technical Support', 'Technical assistance and troubleshooting', 30, '#10B981'),
('YOUR_DEPARTMENT_ID_2', 'Account Services', 'Account management and updates', 20, '#F59E0B');
*/

-- Enable Row Level Security (RLS)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth setup)
CREATE POLICY "Users can view services in their organization" ON public.services
    FOR SELECT USING (
        department_id IN (
            SELECT d.id FROM public.departments d
            JOIN public.branches b ON d.branch_id = b.id
            WHERE b.organization_id = (
                SELECT organization_id FROM public.members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Members can manage services in their organization" ON public.services
    FOR ALL USING (
        department_id IN (
            SELECT d.id FROM public.departments d
            JOIN public.branches b ON d.branch_id = b.id
            WHERE b.organization_id = (
                SELECT organization_id FROM public.members WHERE user_id = auth.uid()
            )
        )
    );
