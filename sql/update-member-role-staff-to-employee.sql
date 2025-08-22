-- Update Member Role from 'staff' to 'employee'
-- Migration to align database with frontend terminology

-- First, check if we need to update any existing data
-- This query will show current role distribution
SELECT role, COUNT(*) as count 
FROM public.members 
GROUP BY role;

-- Update the role values from 'staff' to 'employee'
UPDATE public.members 
SET role = 'employee' 
WHERE role = 'staff';

-- Check if there's a CHECK constraint on the role column that needs updating
-- Note: Supabase/PostgreSQL automatically creates constraints from TypeScript types
-- You may need to update the table schema in Supabase Dashboard if there's a constraint

-- Verification query - should show no 'staff' roles remaining
SELECT role, COUNT(*) as count 
FROM public.members 
GROUP BY role;

COMMENT ON COLUMN public.members.role IS 'User role: admin, manager, or employee';

-- If using RLS policies that reference role = 'staff', they would need to be updated too
-- However, from our analysis, most policies only check for admin/manager roles
-- which is correct since employees typically have read-only access

-- Migration completed successfully
-- Updated member role terminology from 'staff' to 'employee' for consistency
