import api from './client'
import type { AuditLogEntry, AuditOpportunity, OpportunityStatus } from './types'

export interface OpportunityCompetencyInput {
  competency_id: number
  required_level: string
}

export interface OpportunityInput {
  client_id: number | null
  title: string
  description?: string | null
  audit_type?: string | null
  city?: string | null
  state?: string | null
  address?: string | null
  start_date?: string | null
  end_date?: string | null
  number_of_days: number
  payment_amount?: number | null
  travel_expenses: string
  lodging: string
  transportation: string
  application_deadline?: string | null
  auditors_required: number
  responsible_user_id?: number | null
  competencies: OpportunityCompetencyInput[]
}

export async function fetchOpportunities(params?: {
  status?: OpportunityStatus
  client_id?: number
}): Promise<AuditOpportunity[]> {
  const { data } = await api.get<AuditOpportunity[]>('/opportunities', { params })
  return data
}

export async function fetchOpportunity(id: number): Promise<AuditOpportunity> {
  const { data } = await api.get<AuditOpportunity>(`/opportunities/${id}`)
  return data
}

export async function createOpportunity(input: OpportunityInput): Promise<AuditOpportunity> {
  const { data } = await api.post<AuditOpportunity>('/opportunities', input)
  return data
}

export async function updateOpportunity(
  id: number,
  input: Partial<OpportunityInput>,
): Promise<AuditOpportunity> {
  const { data } = await api.patch<AuditOpportunity>(`/opportunities/${id}`, input)
  return data
}

export async function publishOpportunity(id: number): Promise<AuditOpportunity> {
  const { data } = await api.post<AuditOpportunity>(`/opportunities/${id}/publish`)
  return data
}

export async function transitionOpportunity(
  id: number,
  to_status: OpportunityStatus,
): Promise<AuditOpportunity> {
  const { data } = await api.post<AuditOpportunity>(`/opportunities/${id}/transition`, {
    to_status,
  })
  return data
}

export async function cancelOpportunity(id: number, reason: string): Promise<AuditOpportunity> {
  const { data } = await api.post<AuditOpportunity>(`/opportunities/${id}/cancel`, { reason })
  return data
}

export async function fetchOpportunityHistory(id: number): Promise<AuditLogEntry[]> {
  const { data } = await api.get<AuditLogEntry[]>(`/opportunities/${id}/history`)
  return data
}
