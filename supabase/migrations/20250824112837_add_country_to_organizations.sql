-- Add country field to organizations table
-- This will be used to set the default country code for customer phone number entry

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Egypt',
ADD COLUMN IF NOT EXISTS country_code VARCHAR(5) DEFAULT '+20';

-- Create index for country-based queries
CREATE INDEX IF NOT EXISTS idx_organizations_country ON public.organizations(country);
CREATE INDEX IF NOT EXISTS idx_organizations_country_code ON public.organizations(country_code);

-- Update existing organizations with default Egypt if no country is set
UPDATE public.organizations 
SET 
  country = 'Egypt',
  country_code = '+20'
WHERE country IS NULL OR country = '';

COMMENT ON COLUMN public.organizations.country IS 'Organization country for phone number validation and display';
COMMENT ON COLUMN public.organizations.country_code IS 'International country code (e.g., +1, +20, +44)';