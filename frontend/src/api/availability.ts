import api from './client'
import type { AvailabilityBlock } from './types'

export interface AvailabilityInput {
  start_date: string
  end_date: string
  availability_type: string
  notes?: string | null
}

export async function fetchMyAvailability(): Promise<AvailabilityBlock[]> {
  const { data } = await api.get<AvailabilityBlock[]>('/auditors/me/availability')
  return data
}

export async function addMyAvailability(input: AvailabilityInput): Promise<AvailabilityBlock> {
  const { data } = await api.post<AvailabilityBlock>('/auditors/me/availability', input)
  return data
}

export async function removeMyAvailability(id: number): Promise<{ message: string }> {
  const { data } = await api.delete<{ message: string }>(`/auditors/me/availability/${id}`)
  return data
}

export async function fetchAuditorAvailability(auditorId: number): Promise<AvailabilityBlock[]> {
  const { data } = await api.get<AvailabilityBlock[]>(`/auditors/${auditorId}/availability`)
  return data
}

export async function addAuditorAvailability(
  auditorId: number,
  input: AvailabilityInput,
): Promise<AvailabilityBlock> {
  const { data } = await api.post<AvailabilityBlock>(`/auditors/${auditorId}/availability`, input)
  return data
}
