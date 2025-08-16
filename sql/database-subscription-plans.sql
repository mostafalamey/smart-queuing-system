-- Multi-Tenant SaaS Subscription Plans Migration
-- Add subscription plan and limits to organizations table

-- Add plan and limit columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'business', 'enterprise')),
ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_departments INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_services INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_staff INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS ticket_cap INTEGER DEFAULT 2000,
ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for plan-based queries
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON public.organizations(plan);

-- Set default plan limits based on plan type
UPDATE public.organizations 
SET 
  max_branches = CASE 
    WHEN plan = 'starter' THEN 1
    WHEN plan = 'growth' THEN 3
    WHEN plan = 'business' THEN 10
    WHEN plan = 'enterprise' THEN -1  -- -1 means unlimited
  END,
  max_departments = CASE 
    WHEN plan = 'starter' THEN 3
    WHEN plan = 'growth' THEN 10
    WHEN plan = 'business' THEN 50
    WHEN plan = 'enterprise' THEN -1
  END,
  max_services = CASE 
    WHEN plan = 'starter' THEN 10
    WHEN plan = 'growth' THEN 30
    WHEN plan = 'business' THEN 200
    WHEN plan = 'enterprise' THEN -1
  END,
  max_staff = CASE 
    WHEN plan = 'starter' THEN 5
    WHEN plan = 'growth' THEN 20
    WHEN plan = 'business' THEN 100
    WHEN plan = 'enterprise' THEN -1
  END,
  ticket_cap = CASE 
    WHEN plan = 'starter' THEN 2000
    WHEN plan = 'growth' THEN 10000
    WHEN plan = 'business' THEN 50000
    WHEN plan = 'enterprise' THEN -1
  END
WHERE plan IS NOT NULL;

-- Create a function to check branch limits
CREATE OR REPLACE FUNCTION check_branch_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_branches INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get current branch count
  SELECT COUNT(*) INTO current_branches
  FROM public.branches 
  WHERE organization_id = org_id;
  
  -- Get max allowed branches
  SELECT max_branches INTO max_allowed
  FROM public.organizations 
  WHERE id = org_id;
  
  -- Return true if under limit (or unlimited plan)
  RETURN (max_allowed = -1 OR current_branches < max_allowed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check department limits
CREATE OR REPLACE FUNCTION check_department_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_departments INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get current department count across all branches
  SELECT COUNT(d.*) INTO current_departments
  FROM public.departments d
  JOIN public.branches b ON d.branch_id = b.id
  WHERE b.organization_id = org_id;
  
  -- Get max allowed departments
  SELECT max_departments INTO max_allowed
  FROM public.organizations 
  WHERE id = org_id;
  
  -- Return true if under limit (or unlimited plan)
  RETURN (max_allowed = -1 OR current_departments < max_allowed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check service limits
CREATE OR REPLACE FUNCTION check_service_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_services INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get current service count across all departments in all branches
  SELECT COUNT(s.*) INTO current_services
  FROM public.services s
  JOIN public.departments d ON s.department_id = d.id
  JOIN public.branches b ON d.branch_id = b.id
  WHERE b.organization_id = org_id;
  
  -- Get max allowed services
  SELECT max_services INTO max_allowed
  FROM public.organizations 
  WHERE id = org_id;
  
  -- Return true if under limit (or unlimited plan)
  RETURN (max_allowed = -1 OR current_services < max_allowed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION check_staff_limit(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_staff INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Get current staff count
  SELECT COUNT(*) INTO current_staff
  FROM public.members 
  WHERE organization_id = org_id AND is_active = true;
  
  -- Get max allowed staff
  SELECT max_staff INTO max_allowed
  FROM public.organizations 
  WHERE id = org_id;
  
  -- Return true if under limit (or unlimited plan)
  RETURN (max_allowed = -1 OR current_staff < max_allowed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get current usage stats
CREATE OR REPLACE FUNCTION get_organization_usage(org_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'branches', (
      SELECT COUNT(*) FROM public.branches WHERE organization_id = org_id
    ),
    'departments', (
      SELECT COUNT(d.*) 
      FROM public.departments d
      JOIN public.branches b ON d.branch_id = b.id
      WHERE b.organization_id = org_id
    ),
    'services', (
      SELECT COUNT(s.*) 
      FROM public.services s
      JOIN public.departments d ON s.department_id = d.id
      JOIN public.branches b ON d.branch_id = b.id
      WHERE b.organization_id = org_id
    ),
    'staff', (
      SELECT COUNT(*) FROM public.members WHERE organization_id = org_id AND is_active = true
    ),
    'tickets_this_month', (
      SELECT COUNT(*) 
      FROM public.tickets t
      JOIN public.departments d ON t.department_id = d.id
      JOIN public.branches b ON d.branch_id = b.id
      WHERE b.organization_id = org_id 
      AND t.created_at >= date_trunc('month', CURRENT_DATE)
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing organizations with default starter plan if no plan is set
UPDATE public.organizations 
SET 
  plan = 'starter',
  max_branches = 1,
  max_departments = 3,
  max_services = 10,
  max_staff = 5,
  ticket_cap = 2000,
  plan_updated_at = NOW()
WHERE plan IS NULL OR plan = '';

-- Add RLS policies for branch creation with limits
-- First, let's add the RLS policy for branches table
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can insert branches within limits" ON public.branches;
DROP POLICY IF EXISTS "Users can view branches for their organization" ON public.branches;
DROP POLICY IF EXISTS "Admins can update branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can delete branches" ON public.branches;

-- Create new policies with limit checking
CREATE POLICY "Users can view branches for their organization" ON public.branches
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.members 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert branches within limits" ON public.branches
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT m.organization_id 
      FROM public.members m
      WHERE m.auth_user_id = auth.uid() 
      AND m.is_active = true
      AND m.role IN ('admin', 'manager')
    )
    AND check_branch_limit(organization_id)
  );

CREATE POLICY "Admins can update branches" ON public.branches
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.members 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'manager')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can delete branches" ON public.branches
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.members 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Similar policies for departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert departments within limits" ON public.departments;
DROP POLICY IF EXISTS "Users can view departments for their organization" ON public.departments;
DROP POLICY IF EXISTS "Admins can update departments" ON public.departments;
DROP POLICY IF EXISTS "Admins can delete departments" ON public.departments;

CREATE POLICY "Users can view departments for their organization" ON public.departments
  FOR SELECT USING (
    branch_id IN (
      SELECT b.id 
      FROM public.branches b
      JOIN public.members m ON b.organization_id = m.organization_id
      WHERE m.auth_user_id = auth.uid() AND m.is_active = true
    )
  );

CREATE POLICY "Users can insert departments within limits" ON public.departments
  FOR INSERT WITH CHECK (
    branch_id IN (
      SELECT b.id 
      FROM public.branches b
      JOIN public.members m ON b.organization_id = m.organization_id
      WHERE m.auth_user_id = auth.uid() 
      AND m.role IN ('admin', 'manager')
      AND m.is_active = true
      AND check_department_limit(b.organization_id)
    )
  );

CREATE POLICY "Admins can update departments" ON public.departments
  FOR UPDATE USING (
    branch_id IN (
      SELECT b.id 
      FROM public.branches b
      JOIN public.members m ON b.organization_id = m.organization_id
      WHERE m.auth_user_id = auth.uid() 
      AND m.role IN ('admin', 'manager')
      AND m.is_active = true
    )
  );

CREATE POLICY "Admins can delete departments" ON public.departments
  FOR DELETE USING (
    branch_id IN (
      SELECT b.id 
      FROM public.branches b
      JOIN public.members m ON b.organization_id = m.organization_id
      WHERE m.auth_user_id = auth.uid() 
      AND m.role = 'admin'
      AND m.is_active = true
    )
  );

-- Similar policies for members (staff)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert members within limits" ON public.members;
DROP POLICY IF EXISTS "Users can view members for their organization" ON public.members;
DROP POLICY IF EXISTS "Admins can update members" ON public.members;
DROP POLICY IF EXISTS "Admins can delete members" ON public.members;

CREATE POLICY "Users can view members for their organization" ON public.members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.members 
      WHERE auth_user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert members within limits" ON public.members
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT m.organization_id 
      FROM public.members m
      WHERE m.auth_user_id = auth.uid() 
      AND m.role IN ('admin', 'manager')
      AND m.is_active = true
      AND check_staff_limit(m.organization_id)
    )
  );

CREATE POLICY "Admins can update members" ON public.members
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.members 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'manager')
      AND is_active = true
    )
  );

CREATE POLICY "Admins can delete members" ON public.members
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM public.members 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
      AND is_active = true
    )
  );

-- Similar policies for services
-- First ensure the services table has RLS enabled (it may already be enabled from previous migrations)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert services within limits" ON public.services;
DROP POLICY IF EXISTS "Users can view services for their organization" ON public.services;
DROP POLICY IF EXISTS "Admins can update services" ON public.services;
DROP POLICY IF EXISTS "Admins can delete services" ON public.services;

CREATE POLICY "Users can view services for their organization" ON public.services
  FOR SELECT USING (
    department_id IN (
      SELECT d.id 
      FROM public.departments d
      JOIN public.branches b ON d.branch_id = b.id
      JOIN public.members m ON b.organization_id = m.organization_id
      WHERE m.auth_user_id = auth.uid() AND m.is_active = true
    )
  );

CREATE POLICY "Users can insert services within limits" ON public.services
  FOR INSERT WITH CHECK (
    department_id IN (
      SELECT d.id 
      FROM public.departments d
      JOIN public.branches b ON d.branch_id = b.id
      JOIN public.members m ON b.organization_id = m.organization_id
      WHERE m.auth_user_id = auth.uid() 
      AND m.role IN ('admin', 'manager')
      AND m.is_active = true
      AND check_service_limit(b.organization_id)
    )
  );

CREATE POLICY "Admins can update services" ON public.services
  FOR UPDATE USING (
    department_id IN (
      SELECT d.id 
      FROM public.departments d
      JOIN public.branches b ON d.branch_id = b.id
      JOIN public.members m ON b.organization_id = m.organization_id
      WHERE m.auth_user_id = auth.uid() 
      AND m.role IN ('admin', 'manager')
      AND m.is_active = true
    )
  );

CREATE POLICY "Admins can delete services" ON public.services
  FOR DELETE USING (
    department_id IN (
      SELECT d.id 
      FROM public.departments d
      JOIN public.branches b ON d.branch_id = b.id
      JOIN public.members m ON b.organization_id = m.organization_id
      WHERE m.auth_user_id = auth.uid() 
      AND m.role = 'admin'
      AND m.is_active = true
    )
  );

-- Create a trigger to update plan_updated_at when plan changes
CREATE OR REPLACE FUNCTION update_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.plan IS DISTINCT FROM NEW.plan OR
     OLD.max_branches IS DISTINCT FROM NEW.max_branches OR
     OLD.max_departments IS DISTINCT FROM NEW.max_departments OR
     OLD.max_services IS DISTINCT FROM NEW.max_services OR
     OLD.max_staff IS DISTINCT FROM NEW.max_staff OR
     OLD.ticket_cap IS DISTINCT FROM NEW.ticket_cap THEN
    NEW.plan_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_plan_updated_at ON public.organizations;
CREATE TRIGGER trigger_plan_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_plan_updated_at();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_branch_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_department_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_service_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_staff_limit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_usage(UUID) TO authenticated;

-- Create a view for easy plan information access
CREATE OR REPLACE VIEW public.organization_plan_info AS
SELECT 
  o.id,
  o.name,
  o.plan,
  o.max_branches,
  o.max_departments,
  o.max_services,
  o.max_staff,
  o.ticket_cap,
  o.plan_updated_at,
  COALESCE(branch_count.count, 0) as current_branches,
  COALESCE(dept_count.count, 0) as current_departments,
  COALESCE(service_count.count, 0) as current_services,
  COALESCE(staff_count.count, 0) as current_staff,
  -- Calculate remaining limits
  CASE 
    WHEN o.max_branches = -1 THEN -1
    ELSE o.max_branches - COALESCE(branch_count.count, 0)
  END as remaining_branches,
  CASE 
    WHEN o.max_departments = -1 THEN -1
    ELSE o.max_departments - COALESCE(dept_count.count, 0)
  END as remaining_departments,
  CASE 
    WHEN o.max_services = -1 THEN -1
    ELSE o.max_services - COALESCE(service_count.count, 0)
  END as remaining_services,
  CASE 
    WHEN o.max_staff = -1 THEN -1
    ELSE o.max_staff - COALESCE(staff_count.count, 0)
  END as remaining_staff
FROM public.organizations o
LEFT JOIN (
  SELECT organization_id, COUNT(*) as count
  FROM public.branches 
  GROUP BY organization_id
) branch_count ON o.id = branch_count.organization_id
LEFT JOIN (
  SELECT b.organization_id, COUNT(d.*) as count
  FROM public.departments d
  JOIN public.branches b ON d.branch_id = b.id
  GROUP BY b.organization_id
) dept_count ON o.id = dept_count.organization_id
LEFT JOIN (
  SELECT b.organization_id, COUNT(s.*) as count
  FROM public.services s
  JOIN public.departments d ON s.department_id = d.id
  JOIN public.branches b ON d.branch_id = b.id
  GROUP BY b.organization_id
) service_count ON o.id = service_count.organization_id
LEFT JOIN (
  SELECT organization_id, COUNT(*) as count
  FROM public.members 
  WHERE is_active = true
  GROUP BY organization_id
) staff_count ON o.id = staff_count.organization_id;

-- Grant access to the view
GRANT SELECT ON public.organization_plan_info TO authenticated;

-- Add RLS to the view
ALTER VIEW public.organization_plan_info SET (security_invoker = on);

COMMENT ON TABLE public.organizations IS 'Organizations with subscription plan limits';
COMMENT ON COLUMN public.organizations.plan IS 'Subscription plan: starter, growth, business, enterprise';
COMMENT ON COLUMN public.organizations.max_branches IS 'Maximum branches allowed (-1 for unlimited)';
COMMENT ON COLUMN public.organizations.max_departments IS 'Maximum departments allowed (-1 for unlimited)';
COMMENT ON COLUMN public.organizations.max_services IS 'Maximum services allowed (-1 for unlimited)';
COMMENT ON COLUMN public.organizations.max_staff IS 'Maximum staff members allowed (-1 for unlimited)';
COMMENT ON COLUMN public.organizations.ticket_cap IS 'Monthly ticket limit (-1 for unlimited)';
COMMENT ON VIEW public.organization_plan_info IS 'View showing organization plan limits and current usage';
