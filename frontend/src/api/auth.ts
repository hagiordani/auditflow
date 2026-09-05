import api from './client'
import type { LoginResponse, Role, User } from './types'

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
  return data
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me')
  return data
}

export async function fetchUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users')
  return data
}

export interface CreateUserInput {
  email: string
  full_name: string
  // `null` → el backend genera una contraseña temporal y la envía por correo.
  password: string | null
  role: Role
  is_active?: boolean
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await api.post<User>('/users', input)
  return data
}

export async function updateUser(
  id: number,
  input: { full_name?: string; role?: Role; is_active?: boolean },
): Promise<User> {
  const { data } = await api.patch<User>(`/users/${id}`, input)
  return data
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await api.post('/auth/change-password', { current_password, new_password })
}

export async function resetPassword(id: number): Promise<void> {
  await api.post(`/users/${id}/reset-password`)
}
