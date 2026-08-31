import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAuditors } from '../api/auditors'
import { fetchUsers } from '../api/auth'
import type { Role } from '../api/types'
import { useAuth } from '../context/AuthContext'

const ROLE_INFO: Record<Role, { title: string; description: string; next: string[] }> = {
  admin: {
    title: 'Administración',
    description: 'Acceso total: usuarios, catálogos y configuración de la plataforma.',
    next: ['Oportunidades de auditoría', 'Asignaciones', 'Reportes e indicadores'],
  },
  operations: {
    title: 'Operaciones',
    description: 'Publica oportunidades de auditoría, revisa interesados y asigna auditores.',
    next: ['Publicar oportunidades', 'Revisar postulaciones', 'Asignar auditores'],
  },
  auditor: {
    title: 'Portal del auditor',
    description: 'Consulta oportunidades compatibles con tu perfil y gestiona tus servicios.',
    next: ['Asignaciones y calendario', 'Documentos', 'Historial de servicios'],
  },
  supervisor: {
    title: 'Supervisión',
    description: 'Consulta servicios, indicadores y costos de la operación.',
    next: ['Indicadores y reportes', 'Servicios por estado', 'Costos de auditorías'],
  },
}

const QUICK_LINKS: Partial<Record<Role, { to: string; label: string }[]>> = {
  admin: [
    { to: '/admin/users', label: 'Usuarios' },
    { to: '/auditors', label: 'Auditores' },
    { to: '/competencies', label: 'Competencias' },
  ],
  operations: [{ to: '/auditors', label: 'Auditores' }],
  auditor: [
    { to: '/auditor/opportunities', label: 'Oportunidades disponibles' },
    { to: '/auditor/applications', label: 'Mis postulaciones' },
    { to: '/auditor/profile', label: 'Mi perfil' },
  ],
}

export function Dashboard() {
  const { user } = useAuth()
  const [userCount, setUserCount] = useState<number | null>(null)
  const [auditorCount, setAuditorCount] = useState<number | null>(null)

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers()
        .then((u) => setUserCount(u.length))
        .catch(() => setUserCount(null))
    }
    if (user?.role === 'admin' || user?.role === 'operations') {
      fetchAuditors()
        .then((a) => setAuditorCount(a.length))
        .catch(() => setAuditorCount(null))
    }
  }, [user])

  if (!user) return null
  const info = ROLE_INFO[user.role]
  const quickLinks = QUICK_LINKS[user.role] ?? []
  const isStaff = user.role === 'admin' || user.role === 'operations'

  return (
    <div>
      <h2 className="page-title">Hola, {user.full_name}</h2>
      <p className="page-subtitle">{info.description}</p>

      <div className="grid">
        <section className="card">
          <h3>{info.title}</h3>
          <p>
            Tu perfil: <strong>{user.email}</strong>
          </p>
        </section>

        {isStaff && (
          <section className="card">
            <h3>Equipo</h3>
            <div className="metric-row">
              <div>
                <p className="stat">{auditorCount === null ? '—' : auditorCount}</p>
                <p className="muted small">Auditores registrados</p>
              </div>
              {user.role === 'admin' && (
                <div>
                  <p className="stat">{userCount === null ? '—' : userCount}</p>
                  <p className="muted small">Usuarios totales</p>
                </div>
              )}
            </div>
          </section>
        )}

        {quickLinks.length > 0 && (
          <section className="card">
            <h3>Accesos rápidos</h3>
            <div className="quick-links">
              {quickLinks.map((link) => (
                <Link key={link.to} to={link.to} className="btn btn-ghost">
                  {link.label} →
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="card">
          <h3>Próximos módulos</h3>
          <ul className="plain-list">
            {info.next.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card card-wide">
        <h3>Estado del proyecto</h3>
        <p>
          Sprint 0–2 completados: autenticación, roles, usuarios, catálogo de auditores,
          competencias y matriz con vigencias. Siguiente paso: clientes y oportunidades de
          auditoría.
        </p>
      </section>
    </div>
  )
}
