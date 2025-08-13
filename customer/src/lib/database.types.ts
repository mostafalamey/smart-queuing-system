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
      }
      branches: {
        Row: {
          id: string
          organization_id: string
          name: string
          address: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
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
      }
      tickets: {
        Row: {
          id: string
          department_id: string
          ticket_number: string
          phone_number: string
          status: 'waiting' | 'called' | 'served' | 'cancelled'
          created_at: string
          called_at: string | null
          served_at: string | null
        }
        Insert: {
          id?: string
          department_id: string
          ticket_number: string
          phone_number: string
          status?: 'waiting' | 'called' | 'served' | 'cancelled'
          created_at?: string
          called_at?: string | null
          served_at?: string | null
        }
      }
      queue_settings: {
        Row: {
          id: string
          department_id: string
          current_serving: string | null
          last_ticket_number: number
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
