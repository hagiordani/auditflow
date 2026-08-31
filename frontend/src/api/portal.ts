import api from './client'
import type {
  ApplicationDecision,
  Auditor,
  AuditorOpportunity,
  MyApplication,
} from './types'

export async function fetchMyAuditorProfile(): Promise<Auditor> {
  const { data } = await api.get<Auditor>('/auditors/me')
  return data
}

export async function fetchMyOpportunities(): Promise<AuditorOpportunity[]> {
  const { data } = await api.get<AuditorOpportunity[]>('/auditors/me/opportunities')
  return data
}

export async function fetchMyApplications(): Promise<MyApplication[]> {
  const { data } = await api.get<MyApplication[]>('/auditors/me/applications')
  return data
}

export async function applyToOpportunity(
  opportunityId: number,
  decision: ApplicationDecision,
  comments?: string,
): Promise<{ message: string; decision: string }> {
  const { data } = await api.post<{ message: string; decision: string }>(
    `/opportunities/${opportunityId}/apply`,
    { decision, comments: comments || null },
  )
  return data
}
