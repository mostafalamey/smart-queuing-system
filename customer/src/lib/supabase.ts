import { createClient } from "@supabase/supabase-js";
import { Database as DatabaseSchema } from "./database-types-fixed";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<DatabaseSchema>(
  supabaseUrl,
  supabaseAnonKey
);

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
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
          country: string | null;
          country_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_org_id?: string | null;
          name: string;
          contact_email?: string | null;
          phone?: string | null;
          website?: string | null;
          address?: string | null;
          welcome_message?: string | null;
          primary_color?: string | null;
          logo_url?: string | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_org_id?: string | null;
          name?: string;
          contact_email?: string | null;
          phone?: string | null;
          website?: string | null;
          address?: string | null;
          welcome_message?: string | null;
          primary_color?: string | null;
          logo_url?: string | null;
          country?: string | null;
          country_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      branches: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          branch_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          branch_id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      members: {
        Row: {
          id: string;
          auth_user_id: string;
          email: string;
          name: string | null;
          role: string;
          organization_id: string;
          branch_id: string | null;
          department_ids: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          email: string;
          name?: string | null;
          role: string;
          organization_id: string;
          branch_id?: string | null;
          department_ids?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          email?: string;
          name?: string | null;
          role?: string;
          organization_id?: string;
          branch_id?: string | null;
          department_ids?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tickets: {
        Row: {
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
        };
        Insert: {
          id?: string;
          ticket_number: number;
          customer_phone: string;
          status: string;
          priority?: number;
          estimated_service_time?: number | null;
          called_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          department_id: string;
        };
        Update: {
          id?: string;
          ticket_number?: number;
          customer_phone?: string;
          status?: string;
          priority?: number;
          estimated_service_time?: number | null;
          called_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
          department_id?: string;
        };
      };
    };
  };
};
