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

export interface Client {
  id: number
  business_name: string
  commercial_name: string | null
  tax_id: string | null
  address: string | null
  city: string | null
  state: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
}

export type OpportunityStatus =
  | 'draft'
  | 'published'
  | 'has_interested'
  | 'under_review'
  | 'assigned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'invoice_received'
  | 'paid'
  | 'cancelled'

export interface OpportunityCompetency {
  id: number
  competency: Competency
  required_level: string
}

export interface AuditOpportunity {
  id: number
  folio: string
  client: Client | null
  title: string
  description: string | null
  audit_type: string | null
  city: string | null
  state: string | null
  address: string | null
  start_date: string | null
  end_date: string | null
  number_of_days: number
  payment_amount: number | null
  travel_expenses: string
  lodging: string
  transportation: string
  application_deadline: string | null
  auditors_required: number
  responsible: { id: number; full_name: string } | null
  status: OpportunityStatus
  cancel_reason: string | null
  competencies: OpportunityCompetency[]
  created_at: string
  updated_at: string
}

export interface AuditLogEntry {
  id: number
  user: { id: number; full_name: string } | null
  action: string
  entity_type: string
  entity_id: number | null
  previous_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}
