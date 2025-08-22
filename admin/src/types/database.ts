export interface Organization {
  id: string;
  clerk_org_id: string | null;
  name: string;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  welcome_message: string | null;
  primary_color: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  auth_user_id: string;
  email: string;
  name: string | null;
  role: string;
  organization_id: string;
  branch_id: string | null;
  department_ids: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  onboarding_completed?: boolean | null;
  onboarding_skipped?: boolean | null;
  onboarding_completed_at?: string | null;
}

export interface Ticket {
  id: string;
  ticket_number: number;
  customer_phone: string;
  status: string;
  priority: number;
  estimated_service_time: number | null;
  called_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  department_id: string;
}

export type UserRole = "admin" | "manager" | "employee";
export type TicketStatus = "waiting" | "called" | "served" | "cancelled";
