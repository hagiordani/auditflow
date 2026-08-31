import api from './client'
import type { StaffApplication } from './types'

export async function fetchApplications(opportunityId: number): Promise<StaffApplication[]> {
  const { data } = await api.get<StaffApplication[]>(`/opportunities/${opportunityId}/applications`)
  return data
}
