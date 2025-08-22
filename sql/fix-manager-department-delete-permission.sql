-- Fix: Allow managers to delete departments
-- Current issue: RLS policy only allows admins to delete departments
-- Solution: Update the policy to include managers

-- Drop the current restrictive policy
DROP POLICY IF EXISTS "Admins can delete departments" ON public.departments;

-- Create new policy that allows both admins and managers to delete departments
CREATE POLICY "Admins and managers can delete departments" ON public.departments
  FOR DELETE USING (
    branch_id IN (
      SELECT b.id 
      FROM public.branches b
      JOIN public.members m ON b.organization_id = m.organization_id
      WHERE m.auth_user_id = auth.uid() 
      AND m.role IN ('admin', 'manager')  -- ✅ Now includes managers!
      AND m.is_active = true
    )
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename, 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'departments' 
AND policyname = 'Admins and managers can delete departments';
