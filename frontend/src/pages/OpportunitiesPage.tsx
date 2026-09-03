import { useEffect, useMemo, useRef, useState } from 'react'
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
import { normalizeState } from '../utils/mexico'

/** Estados visibles en el filtro de estado. */
const FILTER_STATUSES: (OpportunityStatus | 'all')[] = [
  'all',
  'published',
  'assigned',
  'completed',
  'in_progress',
]

type PeriodFilterValue = 'all' | 7 | 30 | 90 | 365

const PERIOD_OPTIONS: { value: PeriodFilterValue; label: string }[] = [
  { value: 'all', label: 'Todas las fechas' },
  { value: 7, label: 'Últimos 7 días' },
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 3 meses' },
  { value: 365, label: 'Últimos 12 meses' },
]

export function OpportunitiesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [opportunities, setOpportunities] = useState<AuditOpportunity[]>([])
  const [view, setView] = useState<'cards' | 'list'>('list')
  const initialStatus = (searchParams.get('status') as OpportunityStatus | null) ?? 'all'
  const [statusFilter, setStatusFilter] = useState<OpportunityStatus | 'all'>(
    FILTER_STATUSES.includes(initialStatus) ? initialStatus : 'all',
  )
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [stateFilter, setStateFilter] = useState(searchParams.get('state') ?? '')
  const [period, setPeriod] = useState<PeriodFilterValue>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const canEdit = user?.role === 'admin' || user?.role === 'operations'
  const [selectedId, setSelectedId] = useState<number | null>(null)

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
    const stateNorm = normalizeState(stateFilter)
    const cutoff = period === 'all'
      ? null
      : new Date(Date.now() - period * 86400000).toISOString()
    return opportunities.filter((o) => {
      if (q) {
        const match = [o.folio, o.title, o.client?.business_name, o.client?.commercial_name, o.city, o.state]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
        if (!match) return false
      }
      if (stateFilter && normalizeState(o.state ?? '') !== stateNorm) return false
      if (cutoff && o.created_at && o.created_at < cutoff) return false
      return true
    })
  }, [opportunities, query, stateFilter, period])

  const handlePublish = async (opp: AuditOpportunity) => {
    setError('')
    try {
      await publishOpportunity(opp.id)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const selected = opportunities.find((o) => o.id === selectedId) ?? null

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
          {FILTER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Estado: Todos' : `Estado: ${OPPORTUNITY_STATUS_LABELS[s]}`}
            </option>
          ))}
        </select>
        <PeriodDropdown value={period} onChange={setPeriod} />
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

      {stateFilter && (
        <div className="filter-chip-row">
          <span className="filter-chip">
            Estado: {stateFilter}
            <button
              type="button"
              aria-label="Quitar filtro de estado"
              onClick={() => {
                setStateFilter('')
                setSearchParams({})
              }}
            >
              ×
            </button>
          </span>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && view === 'cards' && (
        <div className="opp-grid">
          {filtered.map((o) => (
            <article
              key={o.id}
              className={`opportunity-card ${o.id === selected?.id ? 'selected' : ''}`}
              onClick={() => setSelectedId(o.id)}
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedId(o.id)}
            >
              <div className="occ-head">
                <span className="mono muted small">{o.folio}</span>
                <span className={`status-badge ${OPPORTUNITY_STATUS_CLASS[o.status]}`}>
                  {OPPORTUNITY_STATUS_LABELS[o.status]}
                </span>
              </div>
              <h3>
                <Link to={`/opportunities/${o.id}`} className="link" onClick={(e) => e.stopPropagation()}>
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
              {o.competencies.length > 0 && (
                <div className="occ-comps">
                  {o.competencies.map((c) => (
                    <span key={c.id} className="occ-comp-chip">
                      {c.competency.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="occ-footer">
                <strong className="occ-payment">{formatMoney(o.payment_amount)}</strong>
                <div className="row-actions">
                  <button type="button" className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); setSelectedId(o.id) }}>
                    Ver
                  </button>
                  {canEdit && o.status !== 'cancelled' && (
                    <Link to={`/opportunities/${o.id}/edit`} className="btn btn-sm btn-ghost" onClick={(e) => e.stopPropagation()}>
                      Editar
                    </Link>
                  )}
                  {canEdit && o.status === 'draft' && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={(e) => { e.stopPropagation(); handlePublish(o) }}
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
            {stateFilter ? ` en ${stateFilter}` : ''}
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
                  <tr key={o.id} className={o.id === selected?.id ? 'selected' : ''} onClick={() => setSelectedId(o.id)}>
                    <td className="mono">{o.folio}</td>
                    <td>
                      <Link to={`/opportunities/${o.id}`} className="link" onClick={(e) => e.stopPropagation()}>
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
                    <td className="row-actions" onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedId(o.id)}>
                        Ver
                      </button>
                      {canEdit && o.status !== 'cancelled' && (
                        <Link to={`/opportunities/${o.id}/edit`} className="btn btn-sm btn-ghost">
                          Editar
                        </Link>
                      )}
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

      {selected && (
        <OpportunityDetailDrawer
          o={selected}
          canEdit={canEdit}
          onPublish={() => handlePublish(selected)}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function OpportunityDetailDrawer({ o, canEdit, onPublish, onClose }: { o: AuditOpportunity; canEdit: boolean; onPublish: () => void; onClose: () => void }) {
  const [tab, setTab] = useState<'resumen' | 'requisitos'>('resumen')
  const expenses = [
    { label: 'Viáticos', value: o.travel_expenses },
    { label: 'Hospedaje', value: o.lodging },
    { label: 'Transporte', value: o.transportation },
  ].filter((e) => e.value === 'included')
  return (
    <div className="mk-drawer-overlay" onClick={onClose}>
      <div className="mk-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Detalle de oportunidad">
        <div className="mk-drawer-head">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>← Oportunidad</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>
        <span className={`status-badge ${OPPORTUNITY_STATUS_CLASS[o.status]}`}>● {OPPORTUNITY_STATUS_LABELS[o.status]}</span>
        <h2 className="mk-detail-title">{o.title}</h2>
        <div className="mk-detail-client">{o.client?.commercial_name || o.client?.business_name || 'Sin cliente'}</div>
        <div className="mk-detail-loc">📍 {[o.city, o.state].filter(Boolean).join(', ') || '—'} · 📅 {formatDate(o.start_date)} → {formatDate(o.end_date)} ({o.number_of_days} días)</div>

        <div className="mk-detail-tabs" role="tablist">
          <button type="button" className={tab === 'resumen' ? 'active' : ''} onClick={() => setTab('resumen')}>Resumen</button>
          <button type="button" className={tab === 'requisitos' ? 'active' : ''} onClick={() => setTab('requisitos')}>Requisitos</button>
        </div>

        <div className="mk-detail-offer">
          <span className="mk-detail-offer-label">OFERTA ECONÓMICA</span>
          <span className="mk-detail-offer-value">{formatMoney(o.payment_amount)}</span>
          <span className="mk-detail-offer-sub">Total del servicio</span>
        </div>

        {tab === 'resumen' ? (
          <>
            <dl className="oc-drawer-rows">
              <div className="oc-drawer-row"><dt>Cliente</dt><dd>{o.client?.commercial_name || o.client?.business_name || '—'}</dd></div>
              <div className="oc-drawer-row"><dt>Puesto a auditar</dt><dd>{o.title}</dd></div>
              <div className="oc-drawer-row"><dt>Norma / Esquema</dt><dd>{o.competencies.map((c) => c.competency.name).join(', ')}</dd></div>
              <div className="oc-drawer-row"><dt>Especialidad</dt><dd>{o.competencies.map((c) => c.required_level).join(', ')}</dd></div>
              <div className="oc-drawer-row"><dt>Rol requerido</dt><dd>{o.competencies.map((c) => c.required_level).join(', ')}</dd></div>
              <div className="oc-drawer-row"><dt>Fecha límite</dt><dd>{o.application_deadline ? formatDate(o.application_deadline) : '—'}</dd></div>
            </dl>
            {expenses.length > 0 && (
              <div className="mk-detail-expenses">
                <span className="mk-section-label">Incluido</span>
                <div className="mk-expense-list">{expenses.map((e) => <span key={e.label} className="mk-expense">✓ {e.label} incluido</span>)}</div>
              </div>
            )}
          </>
        ) : (
          <>
            <span className="mk-section-label">Requisitos</span>
            <ul className="mk-req-list">{o.competencies.map((c) => <li key={c.id}>✓ {c.competency.name} · {c.required_level}</li>)}</ul>
            <div className="mk-detail-requirements">
              {o.competencies.map((c) => <span key={c.id} className="mk-norm">{c.competency.name} · {c.required_level}</span>)}
            </div>
          </>
        )}

        {o.description && <p className="oc-detail-desc">{o.description}</p>}

        <div className="mk-detail-actions">
          <Link to={`/opportunities/${o.id}`} className="btn btn-ghost">Abrir página completa</Link>
          {canEdit && o.status !== 'cancelled' && (
            <Link to={`/opportunities/${o.id}/edit`} className="btn btn-ghost">Editar</Link>
          )}
          {canEdit && o.status === 'draft' && (
            <button type="button" className="btn btn-primary" onClick={onPublish}>Publicar</button>
          )}
        </div>
      </div>
    </div>
  )
}

function PeriodDropdown({ value, onChange }: { value: PeriodFilterValue; onChange: (v: PeriodFilterValue) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  const current = PERIOD_OPTIONS.find((o) => o.value === value) ?? PERIOD_OPTIONS[0]
  return (
    <div className="period-dd" ref={ref}>
      <button
        type="button"
        className="period-dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{current.label}</span>
        <span className="period-dd-caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="period-dd-menu" role="listbox">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={String(o.value)}
              type="button"
              role="option"
              aria-selected={value === o.value}
              className={`period-dd-item ${value === o.value ? 'active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
