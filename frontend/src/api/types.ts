export type Role = 'admin' | 'operations' | 'auditor' | 'supervisor'

export interface User {
  id: number
  email: string
  full_name: string
  role: Role
  is_active: boolean
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}
