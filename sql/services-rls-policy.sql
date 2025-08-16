-- Add anonymous access policy to existing services table RLS policies
-- This will work alongside the existing authenticated user policies

-- Create a policy that allows anonymous users to read only active services
CREATE POLICY "Allow anonymous read access to active services" ON services
  FOR SELECT 
  TO anon
  USING (is_active = true);

-- The existing policies will remain:
-- 1. "Users can view services in their organization" (for authenticated users)
-- 2. "Members can manage services in their organization" (for authenticated users)
-- 3. New: "Allow anonymous read access to active services" (for customer app)

-- Verify all policies on the services table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'services';
