import api from './client'
import type { Auditor, AvailabilityStatus } from './types'

export interface AuditorCreateInput {
  email: string
  full_name: string
  password: string | null
  phone?: string | null
  city?: string | null
  state?: string | null
  daily_rate?: number | null
  tax_id?: string | null
  bank_information?: string | null
  availability_status?: AvailabilityStatus
  notes?: string | null
}

export interface AuditorUpdateInput {
  phone?: string | null
  city?: string | null
  state?: string | null
  daily_rate?: number | null
  tax_id?: string | null
  bank_information?: string | null
  availability_status?: AvailabilityStatus
  rating?: number | null
  notes?: string | null
}

export interface AssignCompetencyInput {
  competency_id: number
  level: string
  certificate_number?: string | null
  valid_from?: string | null
  valid_until?: string | null
}

export async function fetchAuditors(): Promise<Auditor[]> {
  const { data } = await api.get<Auditor[]>('/auditors')
  return data
}

export async function fetchAuditor(id: number): Promise<Auditor> {
  const { data } = await api.get<Auditor>(`/auditors/${id}`)
  return data
}

export async function createAuditor(input: AuditorCreateInput): Promise<Auditor> {
  const { data } = await api.post<Auditor>('/auditors', input)
  return data
}

export async function updateAuditor(id: number, input: AuditorUpdateInput): Promise<Auditor> {
  const { data } = await api.patch<Auditor>(`/auditors/${id}`, input)
  return data
}

export async function assignCompetency(
  auditorId: number,
  input: AssignCompetencyInput,
): Promise<Auditor> {
  const { data } = await api.post<Auditor>(`/auditors/${auditorId}/competencies`, input)
  return data
}

export async function removeCompetency(auditorId: number, assignmentId: number): Promise<Auditor> {
  const { data } = await api.delete<Auditor>(`/auditors/${auditorId}/competencies/${assignmentId}`)
  return data
}
