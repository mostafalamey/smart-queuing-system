export interface Organization {
  id: string;
  name: string;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  primary_color: string;
  welcome_message: string | null;
  logo_url: string | null;
  country: string | null;
  country_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "manager" | "employee";
  organization_id: string;
  branch_id: string | null;
  department_ids: string[] | null;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  onboarding_completed?: boolean | null;
  onboarding_skipped?: boolean | null;
  onboarding_completed_at?: string | null;
  organizations?: Organization;
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  description: string | null;
  branch_id: string;
  created_at: string;
  updated_at: string;
  branches?: {
    id: string;
    name: string;
  };
}

export interface OrganizationForm {
  name: string;
  contact_email: string;
  phone: string;
  website: string;
  address: string;
  primary_color: string;
  welcome_message: string;
  logo_url: string;
  country: string;
  country_code: string;
}

export interface QRCodeData {
  [key: string]: string;
}
