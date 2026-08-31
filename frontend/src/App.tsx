import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { AuditorDetailPage } from './pages/AuditorDetailPage'
import { AuditorsPage } from './pages/AuditorsPage'
import { Dashboard } from './pages/Dashboard'
import { LoginPage } from './pages/Login'
import { SecurityPage } from './pages/SecurityPage'
import { CompetenciesPage } from './pages/admin/CompetenciesPage'
import { UsersPage } from './pages/admin/UsersPage'
import { ProtectedRoute, RoleRoute } from './routes/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/profile/security" element={<SecurityPage />} />

          <Route element={<RoleRoute roles={['admin', 'operations']} />}>
            <Route path="/auditors" element={<AuditorsPage />} />
            <Route path="/auditors/:auditorId" element={<AuditorDetailPage />} />
          </Route>

          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/competencies" element={<CompetenciesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
