import { Navigate, Outlet } from 'react-router-dom'
import type { Role } from '../api/types'
import { useAuth } from '../context/AuthContext'

/** Requiere sesión iniciada. */
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loading">Cargando…</div>
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Requiere sesión y que el rol esté en `roles`. */
export function RoleRoute({ roles }: { roles: Role[] }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}
