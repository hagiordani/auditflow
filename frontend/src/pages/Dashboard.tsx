import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchAuditorPerformance,
  fetchAuditorSummary,
  fetchByState,
  fetchClientPerformance,
  fetchEvolution,
  fetchSummary,
  type AuditorPerformance,
  type AuditorSummary,
  type ByStateMetric,
  type ClientPerformance,
  type EvolutionPoint,
  type ReportsSummary,
} from '../api/reports'
import type { OpportunityStatus, Role } from '../api/types'
import { DonutChart } from '../components/DonutChart'
import { EvolutionChart } from '../components/EvolutionChart'
import { MexicoMap } from '../components/MexicoMap'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../utils/format'
import { OPPORTUNITY_STATUS_LABELS } from '../utils/status'

const STATUS_COLORS: Record<OpportunityStatus, string> = {
  draft: '#94a3b8',
  published: '#145da0',
  has_interested: '#0ea5e9',
  under_review: '#e99b2f',
  assigned: '#0f4f87',
  confirmed: '#20a05a',
  in_progress: '#f59e0b',
  completed: '#16a34a',
  invoice_received: '#059669',
  paid: '#10b981',
  cancelled: '#dc2626',
}

const ROLE_INFO: Record<Role, { title: string; description: string }> = {
  admin: { title: 'Centro de control', description: 'Visión ejecutiva de toda la operación.' },
  operations: { title: 'Operaciones', description: 'Publica oportunidades y asigna auditores.' },
  auditor: { title: 'Mi agenda', description: 'Oportunidades y asignaciones que te corresponden.' },
  supervisor: { title: 'Supervisión', description: 'Consulta servicios, indicadores y costos.' },
}

function Kpi({
  value,
  label,
  onClick,
}: {
  value: string | number
  label: string
  onClick?: () => void
}) {
  return (
    <div
      className={`kpi-card ${onClick ? 'kpi-clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [summary, setSummary] = useState<ReportsSummary | null>(null)
  const [auditorSummary, setAuditorSummary] = useState<AuditorSummary | null>(null)
  const [auditorPerf, setAuditorPerf] = useState<AuditorPerformance[]>([])
  const [clientPerf, setClientPerf] = useState<ClientPerformance[]>([])
  const [byState, setByState] = useState<ByStateMetric[]>([])
  const [evolution, setEvolution] = useState<EvolutionPoint[]>([])
  const [period, setPeriod] = useState(30)

  useEffect(() => {
    if (!user) return
    if (user.role === 'admin' || user.role === 'operations' || user.role === 'supervisor') {
      fetchSummary().then(setSummary).catch(() => setSummary(null))
    }
    if (user.role === 'admin' || user.role === 'supervisor') {
      fetchAuditorPerformance().then(setAuditorPerf).catch(() => setAuditorPerf([]))
      fetchClientPerformance().then(setClientPerf).catch(() => setClientPerf([]))
      fetchByState().then(setByState).catch(() => setByState([]))
      fetchEvolution(period).then(setEvolution).catch(() => setEvolution([]))
    }
    if (user.role === 'auditor') {
      fetchAuditorSummary().then(setAuditorSummary).catch(() => setAuditorSummary(null))
    }
  }, [user, period])

  if (!user) return null
  const info = ROLE_INFO[user.role]

  const donutSegments = (Object.keys(summary?.opportunities_by_status ?? {}) as OpportunityStatus[])
    .filter((s) => (summary?.opportunities_by_status[s] ?? 0) > 0)
    .map((s) => ({
      label: OPPORTUNITY_STATUS_LABELS[s],
      value: summary!.opportunities_by_status[s],
      color: STATUS_COLORS[s],
    }))

  return (
    <div>
      <h2 className="page-title">{info.title}</h2>
      <p className="page-subtitle">{info.description}</p>

      {user.role === 'auditor' && auditorSummary && (
        <div className="kpi-grid">
          <Kpi value={auditorSummary.available_opportunities} label="Oportunidades disponibles" />
          <Kpi value={auditorSummary.my_applications} label="Mis postulaciones" />
          <Kpi value={auditorSummary.upcoming_assignments} label="Próximas auditorías" />
          <Kpi value={auditorSummary.occupied_days} label="Días ocupados" />
          <Kpi value={auditorSummary.expiring_my_certifications_90d} label="Certs. por vencer (90d)" />
        </div>
      )}

      {(user.role === 'admin' || user.role === 'operations' || user.role === 'supervisor') &&
        summary && (
          <div className="kpi-grid">
            <Kpi
              value={summary.total_opportunities}
              label="Total oportunidades"
              onClick={() => navigate('/opportunities')}
            />
            <Kpi
              value={summary.available}
              label="Disponibles"
              onClick={() => navigate('/opportunities?status=published')}
            />
            <Kpi
              value={summary.in_execution}
              label="En ejecución"
              onClick={() => navigate('/opportunities?status=in_progress')}
            />
            <Kpi
              value={summary.finalized}
              label="Finalizadas"
              onClick={() => navigate('/opportunities?status=completed')}
            />
            <Kpi value={summary.active_auditors} label="Auditores activos" onClick={() => navigate('/auditors')} />
            <Kpi value={summary.total_clients} label="Clientes" onClick={() => navigate('/clients')} />
          </div>
        )}

      {(user.role === 'admin' || user.role === 'supervisor') && summary && (
        <div className="grid grid-2col">
          <section className="card">
            <h3>Oportunidades por estado</h3>
            <DonutChart segments={donutSegments} />
          </section>

          <section className="card">
            <h3>Rendimiento de auditores</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Auditor</th>
                    <th>Asignadas</th>
                    <th>En ejecución</th>
                    <th>Finalizadas</th>
                    <th>Cumplimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {auditorPerf.map((a) => (
                    <tr key={a.auditor_id}>
                      <td>
                        <strong>{a.name}</strong>
                        <div className="muted small">{a.email}</div>
                      </td>
                      <td>{a.assigned}</td>
                      <td>{a.in_execution}</td>
                      <td>{a.finalized}</td>
                      <td>
                        <span
                          className={`badge ${
                            a.completion_pct >= 90
                              ? 'badge-valid'
                              : a.completion_pct >= 70
                                ? 'badge-busy'
                                : 'badge-invalid'
                          }`}
                        >
                          {a.completion_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {auditorPerf.length === 0 && (
                    <tr>
                      <td colSpan={5} className="muted">
                        Sin auditores todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card card-wide">
            <h3>Rendimiento de clientes</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Auditorías</th>
                    <th>En ejecución</th>
                    <th>Finalizadas</th>
                    <th>Monto</th>
                    <th>Cumplimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {clientPerf.map((c) => (
                    <tr key={c.client_id}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>{c.audits}</td>
                      <td>{c.active}</td>
                      <td>{c.finalized}</td>
                      <td>{formatMoney(c.amount)}</td>
                      <td>
                        <span
                          className={`badge ${
                            c.compliance_pct >= 90
                              ? 'badge-valid'
                              : c.compliance_pct >= 70
                                ? 'badge-busy'
                                : 'badge-invalid'
                          }`}
                        >
                          {c.compliance_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {clientPerf.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted">
                        Sin clientes todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {(user.role === 'admin' || user.role === 'supervisor') && (
        <>
          <section className="card card-wide">
            <h3>Auditorías en México</h3>
            <p className="muted small">
              Pasa el cursor sobre un estado para ver el detalle y haz clic para ver sus
              oportunidades.
            </p>
            <MexicoMap data={byState} />
          </section>

          <section className="card card-wide">
            <div className="card-head-row">
              <h3>Evolución de auditorías</h3>
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                style={{ width: 'auto' }}
              >
                <option value={30}>Últimos 30 días</option>
                <option value={90}>Últimos 3 meses</option>
                <option value={180}>Últimos 6 meses</option>
                <option value={365}>Último año</option>
              </select>
            </div>
            <EvolutionChart data={evolution} />
          </section>
        </>
      )}
    </div>
  )
}
