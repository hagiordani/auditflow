import { useEffect, useState } from 'react'
import { getErrorMessage } from '../api/client'
import {
  downloadOpportunitiesCsv,
  fetchAuditorsUsage,
  fetchByClient,
  fetchExpiringCertifications,
  fetchSummary,
  type AuditorUsage,
  type ClientReport,
  type ExpiringCertification,
  type ReportsSummary,
} from '../api/reports'
import { formatMoney } from '../utils/format'
import {
  formatDate,
  OPPORTUNITY_STATUS_CLASS,
  OPPORTUNITY_STATUS_LABELS,
} from '../utils/status'
import type { OpportunityStatus } from '../api/types'

export function ReportsPage() {
  const [summary, setSummary] = useState<ReportsSummary | null>(null)
  const [byClient, setByClient] = useState<ClientReport[]>([])
  const [usage, setUsage] = useState<AuditorUsage[]>([])
  const [expiring, setExpiring] = useState<ExpiringCertification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([
      fetchSummary(),
      fetchByClient(),
      fetchAuditorsUsage(),
      fetchExpiringCertifications(60),
    ])
      .then(([s, c, u, e]) => {
        setSummary(s)
        setByClient(c)
        setUsage(u)
        setExpiring(e)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      await downloadOpportunitiesCsv()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  const statusKeys = Object.keys(summary?.opportunities_by_status ?? {}) as OpportunityStatus[]

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Reportes e indicadores</h2>
          <p className="page-subtitle">Panorama de la operación para dirección.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled={exporting} onClick={handleExport}>
          {exporting ? 'Generando…' : 'Exportar CSV (Excel)'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Cargando…</p>}

      {summary && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-value">{summary.total_opportunities}</span>
              <span className="kpi-label">Oportunidades</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{summary.active_auditors}</span>
              <span className="kpi-label">Auditores activos</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{summary.pending_confirmations}</span>
              <span className="kpi-label">Por confirmar</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{summary.confirmed_assignments}</span>
              <span className="kpi-label">Servicios confirmados</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{formatMoney(summary.confirmed_cost_total)}</span>
              <span className="kpi-label">Costo confirmado total</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{formatMoney(summary.cost_this_month)}</span>
              <span className="kpi-label">Costo este mes</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{summary.invoices_pending}</span>
              <span className="kpi-label">Facturas pendientes</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-value">{summary.expiring_certifications_60d}</span>
              <span className="kpi-label">Certificaciones por vencer (60d)</span>
            </div>
          </div>

          <div className="grid grid-2col">
            <section className="card">
              <h3>Servicios por estado</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusKeys.map((s) => (
                      <tr key={s}>
                        <td>
                          <span className={`status-badge ${OPPORTUNITY_STATUS_CLASS[s]}`}>
                            {OPPORTUNITY_STATUS_LABELS[s]}
                          </span>
                        </td>
                        <td>{summary.opportunities_by_status[s]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h3>Servicios por cliente</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Servicios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byClient.map((c) => (
                      <tr key={c.client_id}>
                        <td>{c.commercial_name || c.business_name}</td>
                        <td>{c.total}</td>
                      </tr>
                    ))}
                    {byClient.length === 0 && (
                      <tr>
                        <td colSpan={2} className="muted">
                          Sin clientes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h3>Auditores más utilizados</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Auditor</th>
                      <th>Asignaciones</th>
                      <th>Confirmadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map((u) => (
                      <tr key={u.auditor_id}>
                        <td>
                          <strong>{u.name}</strong>
                          <div className="muted small">{u.email}</div>
                        </td>
                        <td>{u.total_assignments}</td>
                        <td>{u.confirmed}</td>
                      </tr>
                    ))}
                    {usage.length === 0 && (
                      <tr>
                        <td colSpan={3} className="muted">
                          Sin asignaciones todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h3>Certificaciones por vencer</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Auditor</th>
                      <th>Competencia</th>
                      <th>Vence</th>
                      <th>Días</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiring.map((e, i) => (
                      <tr key={`${e.auditor}-${e.competency}-${i}`}>
                        <td>{e.auditor}</td>
                        <td>
                          {e.competency}
                          <div className="muted small">{e.level}</div>
                        </td>
                        <td>{formatDate(e.valid_until)}</td>
                        <td>
                          <span className={`badge ${e.days_left <= 30 ? 'badge-invalid' : 'badge-busy'}`}>
                            {e.days_left}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {expiring.length === 0 && (
                      <tr>
                        <td colSpan={4} className="muted">
                          Sin vencimientos próximos. ✓
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
