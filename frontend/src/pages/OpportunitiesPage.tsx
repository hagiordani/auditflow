import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import { fetchOpportunities, publishOpportunity } from '../api/opportunities'
import type { AuditOpportunity, OpportunityStatus } from '../api/types'
import { useAuth } from '../context/AuthContext'
import {
  formatDate,
  OPPORTUNITY_STATUS_CLASS,
  OPPORTUNITY_STATUS_LABELS,
} from '../utils/status'
import { formatMoney } from '../utils/format'

const ALL_STATUSES: (OpportunityStatus | 'all')[] = [
  'all',
  'draft',
  'published',
  'has_interested',
  'under_review',
  'assigned',
  'confirmed',
  'in_progress',
  'completed',
  'invoice_received',
  'paid',
  'cancelled',
]

export function OpportunitiesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [opportunities, setOpportunities] = useState<AuditOpportunity[]>([])
  const initialStatus = (searchParams.get('status') as OpportunityStatus | null) ?? 'all'
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | 'all'>(
    ALL_STATUSES.includes(initialStatus) ? initialStatus : 'all',
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const canEdit = user?.role === 'admin' || user?.role === 'operations'

  const load = () => {
    setLoading(true)
    fetchOpportunities(statusFilter === 'all' ? undefined : { status: statusFilter })
      .then(setOpportunities)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter])

  const handleStatusChange = (value: OpportunityStatus | 'all') => {
    setStatusFilter(value)
    if (value === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ status: value })
    }
  }

  const handlePublish = async (opp: AuditOpportunity) => {
    setError('')
    try {
      await publishOpportunity(opp.id)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Oportunidades de auditoría</h2>
          <p className="page-subtitle">
            Servicios publicados para asignación a auditores externos.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/opportunities/new')}
          >
            + Nueva oportunidad
          </button>
        )}
      </div>

      <div className="filter-row">
        <label htmlFor="status-filter">Filtrar por estado:</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as OpportunityStatus | 'all')}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Todos' : OPPORTUNITY_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <section className="card">
        {loading && <p className="muted">Cargando…</p>}
        {!loading && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Servicio</th>
                  <th>Cliente</th>
                  <th>Fechas</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.folio}</td>
                    <td>
                      <Link to={`/opportunities/${o.id}`} className="link">
                        {o.title}
                      </Link>
                      <div className="muted small">
                        {o.city || '—'}
                        {o.state ? `, ${o.state}` : ''}
                      </div>
                    </td>
                    <td>{o.client?.commercial_name || o.client?.business_name || '—'}</td>
                    <td>
                      {formatDate(o.start_date)} → {formatDate(o.end_date)}
                    </td>
                    <td>{formatMoney(o.payment_amount)}</td>
                    <td>
                      <span className={`status-badge ${OPPORTUNITY_STATUS_CLASS[o.status]}`}>
                        {OPPORTUNITY_STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td className="row-actions">
                      <Link to={`/opportunities/${o.id}`} className="btn btn-sm btn-ghost">
                        Ver
                      </Link>
                      {canEdit && o.status === 'draft' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handlePublish(o)}
                        >
                          Publicar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {opportunities.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      Sin oportunidades{statusFilter !== 'all' ? ' en este estado' : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
