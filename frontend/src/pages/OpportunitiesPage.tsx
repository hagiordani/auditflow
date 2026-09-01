import { useEffect, useMemo, useState } from 'react'
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
  const [view, setView] = useState<'cards' | 'list'>('cards')
  const initialStatus = (searchParams.get('status') as OpportunityStatus | null) ?? 'all'
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | 'all'>(
    ALL_STATUSES.includes(initialStatus) ? initialStatus : 'all',
  )
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
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
    setSearchParams(value === 'all' ? {} : { status: value })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return opportunities
    return opportunities.filter((o) =>
      [o.folio, o.title, o.client?.business_name, o.client?.commercial_name, o.city, o.state]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [opportunities, query])

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
          <button type="button" className="btn btn-primary" onClick={() => navigate('/opportunities/new')}>
            + Nueva oportunidad
          </button>
        )}
      </div>

      <div className="toolbar">
        <label className="search">
          <span>⌕</span>
          <input
            type="search"
            placeholder="Buscar por cliente, servicio o folio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as OpportunityStatus | 'all')}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Estado: Todos' : `Estado: ${OPPORTUNITY_STATUS_LABELS[s]}`}
            </option>
          ))}
        </select>
        <div className="view-switch">
          <button
            type="button"
            className={`view-btn ${view === 'cards' ? 'active' : ''}`}
            onClick={() => setView('cards')}
          >
            ▤ Tarjetas
          </button>
          <button
            type="button"
            className={`view-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            ▣ Lista
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && view === 'cards' && (
        <div className="opp-grid">
          {filtered.map((o) => (
            <article key={o.id} className="opportunity-card">
              <div className="occ-head">
                <span className="mono muted small">{o.folio}</span>
                <span className={`status-badge ${OPPORTUNITY_STATUS_CLASS[o.status]}`}>
                  {OPPORTUNITY_STATUS_LABELS[o.status]}
                </span>
              </div>
              <h3>
                <Link to={`/opportunities/${o.id}`} className="link">
                  {o.title}
                </Link>
              </h3>
              <div className="occ-client">
                {o.client?.commercial_name || o.client?.business_name || '—'}
              </div>
              <div className="occ-meta">
                <span>⌖ {[o.city, o.state].filter(Boolean).join(', ') || '—'}</span>
                <span>
                  ◷ {formatDate(o.start_date)} → {formatDate(o.end_date)}
                </span>
              </div>
              <div className="occ-footer">
                <strong className="occ-payment">{formatMoney(o.payment_amount)}</strong>
                <div className="row-actions">
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
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card">
          <p className="muted">
            Sin oportunidades{statusFilter !== 'all' ? ' en este estado' : ''}
            {query ? ' para tu búsqueda' : ''}.
          </p>
        </div>
      )}

      {!loading && view === 'list' && (
        <section className="card">
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
                {filtered.map((o) => (
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
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
