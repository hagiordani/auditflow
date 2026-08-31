import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { AuditorDetailPage } from './pages/AuditorDetailPage'
import { AuditorsPage } from './pages/AuditorsPage'
import { ClientsPage } from './pages/ClientsPage'
import { Dashboard } from './pages/Dashboard'
import { LoginPage } from './pages/Login'
import { OpportunityDetailPage } from './pages/OpportunityDetailPage'
import { OpportunityFormPage } from './pages/OpportunityFormPage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'
import { SecurityPage } from './pages/SecurityPage'
import { StaffCalendarPage } from './pages/StaffCalendarPage'
import { CompetenciesPage } from './pages/admin/CompetenciesPage'
import { UsersPage } from './pages/admin/UsersPage'
import { AuditorApplicationsPage } from './pages/auditor/AuditorApplicationsPage'
import { AuditorAssignmentsPage } from './pages/auditor/AuditorAssignmentsPage'
import { AuditorCalendarPage } from './pages/auditor/AuditorCalendarPage'
import { AuditorDocumentsPage } from './pages/auditor/AuditorDocumentsPage'
import { AuditorOpportunitiesPage } from './pages/auditor/AuditorOpportunitiesPage'
import { AuditorOpportunityDetailPage } from './pages/auditor/AuditorOpportunityDetailPage'
import { AuditorProfilePage } from './pages/auditor/AuditorProfilePage'
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
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/opportunities/new" element={<OpportunityFormPage />} />
            <Route path="/opportunities/:opportunityId/edit" element={<OpportunityFormPage />} />
          </Route>

          <Route element={<RoleRoute roles={['admin', 'operations', 'supervisor']} />}>
            <Route path="/opportunities" element={<OpportunitiesPage />} />
            <Route path="/opportunities/:opportunityId" element={<OpportunityDetailPage />} />
            <Route path="/calendar" element={<StaffCalendarPage />} />
          </Route>

          <Route element={<RoleRoute roles={['auditor']} />}>
            <Route path="/auditor/opportunities" element={<AuditorOpportunitiesPage />} />
            <Route
              path="/auditor/opportunities/:opportunityId"
              element={<AuditorOpportunityDetailPage />}
            />
            <Route path="/auditor/applications" element={<AuditorApplicationsPage />} />
            <Route path="/auditor/assignments" element={<AuditorAssignmentsPage />} />
            <Route path="/auditor/calendar" element={<AuditorCalendarPage />} />
            <Route path="/auditor/documents" element={<AuditorDocumentsPage />} />
            <Route path="/auditor/profile" element={<AuditorProfilePage />} />
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
