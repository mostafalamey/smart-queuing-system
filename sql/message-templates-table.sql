-- Create message_templates table for customizable notification templates
CREATE TABLE IF NOT EXISTS message_templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    templates jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    -- Ensure one template set per organization
    UNIQUE(organization_id)
);

-- Add RLS policies
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access templates for their own organization
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

-- Add index for faster lookups
CREATE INDEX idx_message_templates_organization_id ON message_templates(organization_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_templates_updated_at
    BEFORE UPDATE ON message_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_message_templates_updated_at();

-- Add comment
COMMENT ON TABLE message_templates IS 'Customizable message templates for notifications (WhatsApp, Push, etc.)';
