import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { fetchMyApplications } from '../../api/portal'
import type { MyApplication } from '../../api/types'
import { formatMoney } from '../../utils/format'
import {
  formatDate,
  formatDateTime,
  OPPORTUNITY_STATUS_CLASS,
  OPPORTUNITY_STATUS_LABELS,
} from '../../utils/status'

export function AuditorApplicationsPage() {
  const [applications, setApplications] = useState<MyApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMyApplications()
      .then(setApplications)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h2 className="page-title">Mis postulaciones</h2>
      <p className="page-subtitle">
        Servicios en los que indicaste interés o no disponibilidad.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && applications.length === 0 && (
        <div className="card">
          <p className="muted">Todavía no has respondido ninguna oportunidad.</p>
        </div>
      )}

      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Servicio</th>
                <th>Fechas</th>
                <th>Pago</th>
                <th>Tu respuesta</th>
                <th>Estado del servicio</th>
                <th>Postulado</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.opportunity.folio}</td>
                  <td>
                    <Link to={`/auditor/opportunities/${a.opportunity.id}`} className="link">
                      {a.opportunity.title}
                    </Link>
                    <div className="muted small">
                      {[a.opportunity.city, a.opportunity.state].filter(Boolean).join(', ') ||
                        '—'}
                    </div>
                  </td>
                  <td>
                    {formatDate(a.opportunity.start_date)} → {formatDate(a.opportunity.end_date)}
                  </td>
                  <td>{formatMoney(a.opportunity.payment_amount)}</td>
                  <td>
                    <span
                      className={`badge ${a.decision === 'interested' ? 'badge-valid' : 'badge-invalid'}`}
                    >
                      {a.decision === 'interested' ? 'Me interesa' : 'No disponible'}
                    </span>
                    {a.comments && <div className="muted small">“{a.comments}”</div>}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${OPPORTUNITY_STATUS_CLASS[a.opportunity.status]}`}
                    >
                      {OPPORTUNITY_STATUS_LABELS[a.opportunity.status]}
                    </span>
                  </td>
                  <td>{formatDateTime(a.applied_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
