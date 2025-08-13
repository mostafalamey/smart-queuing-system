export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          contact_email: string | null
          phone: string | null
          website: string | null
          address: string | null
          primary_color: string | null
          logo_url: string | null
          welcome_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_email?: string | null
          phone?: string | null
          website?: string | null
          address?: string | null
          primary_color?: string | null
          logo_url?: string | null
          welcome_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_email?: string | null
          phone?: string | null
          website?: string | null
          address?: string | null
          primary_color?: string | null
          logo_url?: string | null
          welcome_message?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      members: {
        Row: {
          id: string
          auth_user_id: string
          email: string
          name: string
          role: 'admin' | 'manager' | 'staff'
          organization_id: string
          is_active: boolean
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          email: string
          name: string
          role: 'admin' | 'manager' | 'staff'
          organization_id: string
          is_active?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          email?: string
          name?: string
          role?: 'admin' | 'manager' | 'staff'
          organization_id?: string
          is_active?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      branches: {
        Row: {
          id: string
          organization_id: string
          name: string
          address: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          address?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          address?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      departments: {
        Row: {
          id: string
          branch_id: string
          name: string
          prefix: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          branch_id: string
          name: string
          prefix: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          branch_id?: string
          name?: string
          prefix?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          department_id: string
          ticket_number: number
          customer_phone: string
          status: 'waiting' | 'called' | 'served' | 'cancelled'
          priority: number
          estimated_service_time: number
          created_at: string
          updated_at: string
          called_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          department_id: string
          ticket_number: number
          customer_phone: string
          status?: 'waiting' | 'called' | 'served' | 'cancelled'
          priority?: number
          estimated_service_time?: number
          created_at?: string
          updated_at?: string
          called_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          department_id?: string
          ticket_number?: number
          customer_phone?: string
          status?: 'waiting' | 'called' | 'served' | 'cancelled'
          priority?: number
          estimated_service_time?: number
          created_at?: string
          updated_at?: string
          called_at?: string | null
          completed_at?: string | null
        }
      }
      queue_settings: {
        Row: {
          id: string
          department_id: string
          current_serving: string | null
          last_ticket_number: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          department_id: string
          current_serving?: string | null
          last_ticket_number?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          department_id?: string
          current_serving?: string | null
          last_ticket_number?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
