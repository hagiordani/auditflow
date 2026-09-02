import api from './client'
import type { Personal, PersonnelArea, PersonRole } from './types'

export interface EmailInput {
  email: string
  principal?: boolean
}

export interface PersonalInput {
  nombre_completo: string
  celular?: string | null
  activo?: boolean
  rol_ids?: number[]
  area_ids?: number[]
  emails?: EmailInput[]
}

export async function fetchRoles(): Promise<PersonRole[]> {
  const { data } = await api.get<PersonRole[]>('/roles')
  return data
}

export async function createRole(nombre: string): Promise<PersonRole> {
  const { data } = await api.post<PersonRole>('/roles', { nombre })
  return data
}

export async function fetchAreas(): Promise<PersonnelArea[]> {
  const { data } = await api.get<PersonnelArea[]>('/areas')
  return data
}

export async function createArea(codigo: string, nombre?: string): Promise<PersonnelArea> {
  const { data } = await api.post<PersonnelArea>('/areas', { codigo, nombre })
  return data
}

export async function fetchPersonalList(): Promise<Personal[]> {
  const { data } = await api.get<Personal[]>('/personal')
  return data
}

export async function fetchPersonal(id: number): Promise<Personal> {
  const { data } = await api.get<Personal>(`/personal/${id}`)
  return data
}

export async function createPersonal(input: PersonalInput): Promise<Personal> {
  const { data } = await api.post<Personal>('/personal', input)
  return data
}

export async function updatePersonal(
  id: number,
  input: Partial<PersonalInput>,
): Promise<Personal> {
  const { data } = await api.patch<Personal>(`/personal/${id}`, input)
  return data
}
