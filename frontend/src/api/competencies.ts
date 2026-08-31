import api from './client'
import type { Competency } from './types'

export async function fetchCompetencies(): Promise<Competency[]> {
  const { data } = await api.get<Competency[]>('/competencies')
  return data
}

export interface CompetencyInput {
  name: string
  description?: string
  is_active?: boolean
}

export async function createCompetency(input: CompetencyInput): Promise<Competency> {
  const { data } = await api.post<Competency>('/competencies', input)
  return data
}

export async function updateCompetency(
  id: number,
  input: Partial<CompetencyInput>,
): Promise<Competency> {
  const { data } = await api.patch<Competency>(`/competencies/${id}`, input)
  return data
}
