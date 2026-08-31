export type Role = 'admin' | 'operations' | 'auditor' | 'supervisor'

export interface User {
  id: number
  email: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface Competency {
  id: number
  name: string
  description: string | null
  is_active: boolean
}

export interface AuditorCompetency {
  id: number
  competency: Competency
  level: string
  certificate_number: string | null
  valid_from: string | null
  valid_until: string | null
  document_url: string | null
  status: string
  is_valid: boolean
}

export type AvailabilityStatus = 'available' | 'busy' | 'unavailable'

export interface Auditor {
  id: number
  user_id: number
  full_name: string
  email: string
  is_active: boolean
  phone: string | null
  city: string | null
  state: string | null
  daily_rate: number | null
  tax_id: string | null
  bank_information: string | null
  availability_status: AvailabilityStatus
  rating: number | null
  notes: string | null
  competencies: AuditorCompetency[]
}
