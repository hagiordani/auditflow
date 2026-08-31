import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { Role } from '../api/types'
import { NotificationBell } from '../components/NotificationBell'
import { useAuth } from '../context/AuthContext'

const NAV_BY_ROLE: Record<Role, { to: string; label: string }[]> = {
  admin: [
    { to: '/admin/users', label: 'Usuarios' },
    { to: '/auditors', label: 'Auditores' },
    { to: '/competencies', label: 'Competencias' },
    { to: '/clients', label: 'Clientes' },
    { to: '/opportunities', label: 'Oportunidades' },
    { to: '/calendar', label: 'Calendario' },
    { to: '/reports', label: 'Reportes' },
  ],
  operations: [
    { to: '/auditors', label: 'Auditores' },
    { to: '/clients', label: 'Clientes' },
    { to: '/opportunities', label: 'Oportunidades' },
    { to: '/calendar', label: 'Calendario' },
    { to: '/reports', label: 'Reportes' },
  ],
  auditor: [
    { to: '/auditor/opportunities', label: 'Oportunidades' },
    { to: '/auditor/applications', label: 'Mis postulaciones' },
    { to: '/auditor/assignments', label: 'Mis servicios' },
    { to: '/auditor/calendar', label: 'Mi calendario' },
    { to: '/auditor/documents', label: 'Mis documentos' },
    { to: '/auditor/profile', label: 'Mi perfil' },
  ],
  supervisor: [
    { to: '/opportunities', label: 'Oportunidades' },
    { to: '/calendar', label: 'Calendario' },
    { to: '/reports', label: 'Reportes' },
  ],
}

const COMMON_NAV = [{ to: '/profile/security', label: 'Seguridad' }]

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  operations: 'Operaciones',
  auditor: 'Auditor',
  supervisor: 'Supervisor',
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null
  const links = [...(NAV_BY_ROLE[user.role] ?? []), ...COMMON_NAV]

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">AF</span>
          <span className="brand-name">AuditFlow</span>
        </div>
        <nav className="topnav">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="userbox">
          <NotificationBell />
          <div className="user-info">
            <span className="user-name">{user.full_name}</span>
            <span className="user-role">{ROLE_LABELS[user.role]}</span>
          </div>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <footer className="footer">
        AuditFlow · Plataforma privada de asignación de servicios de auditoría
      </footer>
    </div>
  )
}
