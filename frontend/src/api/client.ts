import axios from 'axios'

const TOKEN_KEY = 'auditflow_token'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token vencido o inválido: limpiar sesión y volver al login.
    const status = error.response?.status
    const isAuthCall = error.config?.url?.includes('/auth/')
    if (status === 401 && !isAuthCall && window.location.pathname !== '/login') {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('auditflow_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown } } }).response
    if (response?.data?.detail) return String(response.data.detail)
  }
  if (error instanceof Error && error.message) return error.message
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}

export default api
