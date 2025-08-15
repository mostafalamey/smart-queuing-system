export interface Department {
  id: string
  name: string
  description: string | null
  branches: {
    id: string
    name: string
  }
}

export interface Service {
  id: string
  name: string
  description: string | null
  estimated_time: number
  department_id: string
  is_active: boolean
  department: Department
}

export interface QueueData {
  department: Department
  service: Service | null
  currentServing: string | null
  waitingCount: number
  lastTicketNumber: string | null
}

export interface Branch {
  id: string
  name: string
  address: string
  organization_id: string
}

export interface Organization {
  id: string
  name: string
  logo_url: string | null
  primary_color: string | null
}
