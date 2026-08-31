import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAuditorSummary, fetchSummary, type AuditorSummary, type ReportsSummary } from '../api/reports'
import type { Role } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../utils/format'

const ROLE_INFO: Record<Role, { title: string; description: string }> = {
  admin: {
    title: 'Administración',
    description: 'Acceso total: usuarios, catálogos y configuración de la plataforma.',
  },
  operations: {
    title: 'Operaciones',
    description: 'Publica oportunidades de auditoría, revisa interesados y asigna auditores.',
  },
  auditor: {
    title: 'Portal del auditor',
    description: 'Consulta oportunidades compatibles con tu perfil y gestiona tus servicios.',
  },
  supervisor: {
    title: 'Supervisión',
    description: 'Consulta servicios, indicadores y costos de la operación.',
  },
}

const QUICK_LINKS: Partial<Record<Role, { to: string; label: string }[]>> = {
  admin: [
    { to: '/admin/users', label: 'Usuarios' },
    { to: '/auditors', label: 'Auditores' },
    { to: '/competencies', label: 'Competencias' },
    { to: '/reports', label: 'Reportes' },
  ],
  operations: [
    { to: '/auditors', label: 'Auditores' },
    { to: '/reports', label: 'Reportes' },
  ],
  supervisor: [{ to: '/reports', label: 'Reportes' }],
  auditor: [
    { to: '/auditor/opportunities', label: 'Oportunidades disponibles' },
    { to: '/auditor/applications', label: 'Mis postulaciones' },
    { to: '/auditor/profile', label: 'Mi perfil' },
  ],
}

function Kpi({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="kpi-card">
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<ReportsSummary | null>(null)
  const [auditorSummary, setAuditorSummary] = useState<AuditorSummary | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role === 'admin' || user.role === 'operations' || user.role === 'supervisor') {
      fetchSummary()
        .then(setSummary)
        .catch(() => setSummary(null))
    } else if (user.role === 'auditor') {
      fetchAuditorSummary()
        .then(setAuditorSummary)
        .catch(() => setAuditorSummary(null))
    }
  }, [user])

  if (!user) return null
  const info = ROLE_INFO[user.role]
  const quickLinks = QUICK_LINKS[user.role] ?? []
  const isStaff = ['admin', 'operations', 'supervisor'].includes(user.role)

  return (
    <div>
      <h2 className="page-title">Hola, {user.full_name}</h2>
      <p className="page-subtitle">{info.description}</p>

      {isStaff && summary && (
        <div className="kpi-grid">
          <Kpi value={summary.total_opportunities} label="Oportunidades" />
          <Kpi value={summary.active_auditors} label="Auditores activos" />
          <Kpi value={summary.pending_confirmations} label="Por confirmar" />
          <Kpi value={summary.confirmed_assignments} label="Confirmados" />
          <Kpi value={formatMoney(summary.confirmed_cost_total)} label="Costo confirmado" />
          <Kpi value={summary.invoices_pending} label="Facturas pendientes" />
          <Kpi value={summary.expiring_certifications_60d} label="Certs. por vencer (60d)" />
        </div>
      )}

      {user.role === 'auditor' && auditorSummary && (
        <div className="kpi-grid">
          <Kpi value={auditorSummary.available_opportunities} label="Oportunidades disponibles" />
          <Kpi value={auditorSummary.my_applications} label="Mis postulaciones" />
          <Kpi value={auditorSummary.upcoming_assignments} label="Próximos servicios" />
          <Kpi value={auditorSummary.occupied_days} label="Días ocupados" />
          <Kpi value={auditorSummary.expiring_my_certifications_90d} label="Certs. por vencer (90d)" />
        </div>
      )}

      <div className="grid">
        <section className="card">
          <h3>{info.title}</h3>
          <p>
            Tu perfil: <strong>{user.email}</strong>
          </p>
        </section>

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
          <h3>Flujo del negocio</h3>
          <ul className="plain-list">
            <li>Operaciones publica una oportunidad.</li>
            <li>El sistema la muestra solo a auditores compatibles.</li>
            <li>Los auditores indican interés.</li>
            <li>Operaciones asigna al auditor definitivo.</li>
            <li>El auditor confirma y las fechas quedan bloqueadas.</li>
          </ul>
        </section>
      </div>

      <section className="card card-wide">
        <h3>Estado del proyecto</h3>
        <p>
          Sprints 0–7 completados: autenticación, catálogos, oportunidades, portal del auditor,
          asignaciones, calendario, documentos, notificaciones y reportes. Pendiente: seguridad
          final y despliegue.
        </p>
      </section>
    </div>
  )
}
