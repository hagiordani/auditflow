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
  password: string
  role: Role
  is_active?: boolean
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { data } = await api.post<User>('/users', input)
  return data
}
