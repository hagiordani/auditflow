import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { Role } from '../api/types'
import { NotificationBell } from '../components/NotificationBell'
import { useAuth } from '../context/AuthContext'

const NAV_BY_ROLE: Record<Role, { to: string; label: string; icon: string }[]> = {
  admin: [
    { to: '/opportunities', label: 'Oportunidades', icon: '▣' },
    { to: '/auditors', label: 'Auditores', icon: '♙' },
    { to: '/clients', label: 'Clientes', icon: '▤' },
    { to: '/admin/users', label: 'Usuarios', icon: '☷' },
    { to: '/competencies', label: 'Competencias', icon: '✓' },
    { to: '/calendar', label: 'Calendario', icon: '◷' },
    { to: '/reports', label: 'Reportes', icon: '▥' },
  ],
  operations: [
    { to: '/opportunities', label: 'Oportunidades', icon: '▣' },
    { to: '/auditors', label: 'Auditores', icon: '♙' },
    { to: '/clients', label: 'Clientes', icon: '▤' },
    { to: '/calendar', label: 'Calendario', icon: '◷' },
    { to: '/reports', label: 'Reportes', icon: '▥' },
  ],
  auditor: [
    { to: '/auditor/opportunities', label: 'Oportunidades', icon: '▣' },
    { to: '/auditor/assignments', label: 'Mis auditorías', icon: '♙' },
    { to: '/auditor/calendar', label: 'Calendario', icon: '◷' },
    { to: '/auditor/applications', label: 'Mis postulaciones', icon: '☷' },
    { to: '/auditor/documents', label: 'Mis documentos', icon: '▤' },
    { to: '/auditor/profile', label: 'Mi perfil', icon: '♙' },
  ],
  supervisor: [
    { to: '/opportunities', label: 'Oportunidades', icon: '▣' },
    { to: '/calendar', label: 'Calendario', icon: '◷' },
    { to: '/reports', label: 'Reportes', icon: '▥' },
  ],
}

const COMMON_NAV = [{ to: '/profile/security', label: 'Seguridad', icon: '⚿' }]

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  operations: 'Operaciones',
  auditor: 'Auditor',
  supervisor: 'Supervisor',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || 'AF'
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null
  const links = [
    { to: '/', label: 'Inicio', icon: '⌂' },
    ...(NAV_BY_ROLE[user.role] ?? []),
    ...COMMON_NAV,
  ]

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">✓</span>
          <span className="brand-name">AuditFlow</span>
        </div>
        <div className="top-actions">
          <NotificationBell />
          <div className="userbox">
            <div className="user-info">
              <span className="user-name">{user.full_name}</span>
              <span className="user-role">{ROLE_LABELS[user.role]}</span>
            </div>
            <div className="avatar" title={user.full_name}>
              {initials(user.full_name)}
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <div className="side-section">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className="side-link"
              >
                <span className="side-icon">{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
          </div>
        </aside>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
