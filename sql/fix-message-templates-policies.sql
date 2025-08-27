-- Fix message templates policies by dropping existing ones and recreating them
-- This handles the case where policies already exist

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can access their organization's message templates" ON message_templates;
DROP POLICY IF EXISTS "Public read access to message templates" ON message_templates;
DROP POLICY IF EXISTS "Only admins and managers can insert message templates" ON message_templates;
DROP POLICY IF EXISTS "Only admins and managers can update message templates" ON message_templates;
DROP POLICY IF EXISTS "Only admins and managers can delete message templates" ON message_templates;

-- Recreate policies with correct configuration

-- Policy: Users can only access templates for their own organization (for authenticated admin users)
CREATE POLICY "Users can access their organization's message templates" ON message_templates
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM members 
            WHERE auth_user_id = auth.uid()
        )
    );

-- Policy: Allow public read access to message templates (for customer app)
CREATE POLICY "Public read access to message templates" ON message_templates
    FOR SELECT USING (true);

-- Policy: Only admins and managers can modify templates
CREATE POLICY "Only admins and managers can insert message templates" ON message_templates
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Only admins and managers can update message templates" ON message_templates
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    ) WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Only admins and managers can delete message templates" ON message_templates
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM members 
            WHERE auth_user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );
