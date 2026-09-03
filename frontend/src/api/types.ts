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
  auditor_type: string
  specialty: string | null
  roles: string | null
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

/** Oportunidad vista por el auditor (sin datos del cliente). */
export interface AuditorOpportunity {
  id: number
  folio: string
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
  status: OpportunityStatus
  competencies: OpportunityCompetency[]
  my_application: {
    id: number
    decision: ApplicationDecision
    comments: string | null
    applied_at: string
  } | null
}

export type ApplicationDecision = 'interested' | 'not_available'

export interface MyApplication {
  id: number
  decision: ApplicationDecision
  comments: string | null
  applied_at: string
  opportunity: AuditorOpportunity
}

/** Postulación vista por el staff (incluye datos del auditor). */
export interface StaffApplication {
  id: number
  opportunity_id: number
  auditor: {
    id: number
    full_name: string
    email: string
    city: string | null
    state: string | null
    daily_rate: number | null
  }
  decision: ApplicationDecision
  comments: string | null
  applied_at: string
  reviewed_at: string | null
}

export type AssignmentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled'

/** Asignación vista por el staff. */
export interface StaffAssignment {
  id: number
  opportunity: AuditOpportunity
  auditor_id: number
  auditor_name: string
  auditor_email: string
  payment_amount: number | null
  travel_expenses: string
  lodging: string
  transportation: string
  status: AssignmentStatus
  assigned_at: string
  confirmed_at: string | null
  completed_at: string | null
}

/** Asignación vista por el auditor (incluye datos del cliente: ya fue asignado). */
export interface MyAssignment {
  id: number
  opportunity: AuditorOpportunity
  client: {
    business_name: string
    commercial_name: string | null
    address: string | null
    city: string | null
    state: string | null
  } | null
  payment_amount: number | null
  travel_expenses: string
  lodging: string
  transportation: string
  status: AssignmentStatus
  assigned_at: string
  confirmed_at: string | null
}

export interface AvailabilityBlock {
  id: number
  auditor_id: number
  start_date: string
  end_date: string
  availability_type: string
  notes: string | null
}

export interface AppNotification {
  id: number
  title: string
  message: string
  notification_type: string
  is_read: boolean
  created_at: string
}

export interface DocumentFile {
  id: number
  entity_type: string
  entity_id: number
  document_type: string
  file_name: string
  content_type: string | null
  size_bytes: number | null
  uploaded_by: number
  uploader_name: string | null
  uploaded_at: string
}

export interface CalendarEvent {
  type: 'assignment' | 'unavailability'
  id: number
  title: string
  folio: string | null
  start_date: string
  end_date: string
  status: string | null
}

export interface StaffCalendarEvent {
  assignment_id: number
  folio: string
  title: string
  auditor_name: string
  city: string | null
  state: string | null
  start_date: string
  end_date: string
  status: string
}

export interface PersonRole {
  id: number
  nombre: string
}

export interface PersonnelArea {
  id: number
  codigo: string
  nombre: string | null
}

export interface PersonalEmail {
  id: number
  email: string
  principal: boolean
}

export interface Personal {
  id: number
  nombre_completo: string
  celular: string | null
  activo: boolean
  roles: PersonRole[]
  areas: PersonnelArea[]
  emails: PersonalEmail[]
  created_at: string
  updated_at: string
}
