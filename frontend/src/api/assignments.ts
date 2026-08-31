import api from './client'
import type { MyAssignment, StaffAssignment } from './types'

export interface AssignInput {
  auditor_id: number
  payment_amount?: number | null
}

export async function assignAuditor(
  opportunityId: number,
  input: AssignInput,
): Promise<StaffAssignment> {
  const { data } = await api.post<StaffAssignment>(`/opportunities/${opportunityId}/assign`, input)
  return data
}

export async function fetchOpportunityAssignments(
  opportunityId: number,
): Promise<StaffAssignment[]> {
  const { data } = await api.get<StaffAssignment[]>(`/opportunities/${opportunityId}/assignments`)
  return data
}

export async function fetchMyAssignments(): Promise<MyAssignment[]> {
  const { data } = await api.get<MyAssignment[]>('/auditors/me/assignments')
  return data
}

export async function confirmAssignment(id: number): Promise<MyAssignment> {
  const { data } = await api.post<MyAssignment>(`/assignments/${id}/confirm`)
  return data
}

export async function rejectAssignment(id: number): Promise<MyAssignment> {
  const { data } = await api.post<MyAssignment>(`/assignments/${id}/reject`)
  return data
}

export async function cancelAssignment(id: number): Promise<StaffAssignment> {
  const { data } = await api.post<StaffAssignment>(`/assignments/${id}/cancel`)
  return data
}
