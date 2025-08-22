export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          contact_email: string | null;
          phone: string | null;
          website: string | null;
          address: string | null;
          primary_color: string | null;
          logo_url: string | null;
          welcome_message: string | null;
          plan: string | null;
          max_branches: number | null;
          max_departments: number | null;
          max_services: number | null;
          max_staff: number | null;
          ticket_cap: number | null;
          plan_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_email?: string | null;
          phone?: string | null;
          website?: string | null;
          address?: string | null;
          primary_color?: string | null;
          logo_url?: string | null;
          welcome_message?: string | null;
          plan?: string | null;
          max_branches?: number | null;
          max_departments?: number | null;
          max_services?: number | null;
          max_staff?: number | null;
          ticket_cap?: number | null;
          plan_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_email?: string | null;
          phone?: string | null;
          website?: string | null;
          address?: string | null;
          primary_color?: string | null;
          logo_url?: string | null;
          welcome_message?: string | null;
          plan?: string | null;
          max_branches?: number | null;
          max_departments?: number | null;
          max_services?: number | null;
          max_staff?: number | null;
          ticket_cap?: number | null;
          plan_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      members: {
        Row: {
          id: string;
          auth_user_id: string;
          email: string;
          name: string;
          role: "admin" | "manager" | "employee";
          organization_id: string;
          branch_id: string | null;
          department_ids: string | null;
          is_active: boolean;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          email: string;
          name: string;
          role: "admin" | "manager" | "employee";
          organization_id: string;
          branch_id?: string | null;
          department_ids?: string | null;
          is_active?: boolean;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          email?: string;
          name?: string;
          role?: "admin" | "manager" | "employee";
          organization_id?: string;
          branch_id?: string | null;
          department_ids?: string | null;
          is_active?: boolean;
          avatar_url?: string | null;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          branch_id: string;
          name: string;
          prefix: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          branch_id: string;
          name: string;
          prefix: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          branch_id?: string;
          name?: string;
          prefix?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          department_id: string;
          service_id: string | null;
          ticket_number: number;
          customer_phone: string;
          status: "waiting" | "called" | "served" | "cancelled";
          priority: number;
          estimated_service_time: number;
          created_at: string;
          updated_at: string;
          called_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          department_id: string;
          service_id?: string | null;
          ticket_number: number;
          customer_phone: string;
          status?: "waiting" | "called" | "served" | "cancelled";
          priority?: number;
          estimated_service_time?: number;
          created_at?: string;
          updated_at?: string;
          called_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          department_id?: string;
          service_id?: string | null;
          ticket_number?: number;
          customer_phone?: string;
          status?: "waiting" | "called" | "served" | "cancelled";
          priority?: number;
          estimated_service_time?: number;
          created_at?: string;
          updated_at?: string;
          called_at?: string | null;
          completed_at?: string | null;
        };
      };
      queue_settings: {
        Row: {
          id: string;
          department_id: string;
          current_serving: string | null;
          last_ticket_number: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          current_serving?: string | null;
          last_ticket_number?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          current_serving?: string | null;
          last_ticket_number?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          department_id: string;
          name: string;
          description: string | null;
          service_code: string;
          estimated_duration: number;
          max_daily_capacity: number | null;
          is_active: boolean;
          priority_weight: number;
          color_code: string | null;
          icon_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          name: string;
          description?: string | null;
          service_code: string;
          estimated_duration?: number;
          max_daily_capacity?: number | null;
          is_active?: boolean;
          priority_weight?: number;
          color_code?: string | null;
          icon_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          name?: string;
          description?: string | null;
          service_code?: string;
          estimated_duration?: number;
          max_daily_capacity?: number | null;
          is_active?: boolean;
          priority_weight?: number;
          color_code?: string | null;
          icon_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_queue_settings: {
        Row: {
          id: string;
          service_id: string;
          current_serving: string | null;
          last_ticket_number: number;
          daily_tickets_count: number;
          last_reset_date: string;
          is_service_active: boolean;
          average_service_time: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          current_serving?: string | null;
          last_ticket_number?: number;
          daily_tickets_count?: number;
          last_reset_date?: string;
          is_service_active?: boolean;
          average_service_time?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          current_serving?: string | null;
          last_ticket_number?: number;
          daily_tickets_count?: number;
          last_reset_date?: string;
          is_service_active?: boolean;
          average_service_time?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      service_analytics: {
        Row: {
          id: string;
          service_id: string;
          date: string;
          total_tickets: number;
          served_tickets: number;
          average_wait_time: number;
          average_service_time: number;
          peak_hour: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          date?: string;
          total_tickets?: number;
          served_tickets?: number;
          average_wait_time?: number;
          average_service_time?: number;
          peak_hour?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          date?: string;
          total_tickets?: number;
          served_tickets?: number;
          average_wait_time?: number;
          average_service_time?: number;
          peak_hour?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      service_hierarchy: {
        Row: {
          organization_id: string;
          organization_name: string;
          branch_id: string;
          branch_name: string;
          department_id: string;
          department_name: string;
          service_id: string;
          service_name: string;
          service_code: string;
          service_description: string | null;
          estimated_duration: number;
          service_active: boolean;
          current_serving: string | null;
          last_ticket_number: number;
          is_service_active: boolean;
          waiting_tickets: number;
        };
      };
    };
  };
}
