import { useEffect, useMemo, useState } from 'react'
import { getErrorMessage } from '../../api/client'
import { fetchMyAssignments } from '../../api/assignments'
import {
  applyToOpportunity,
  fetchMyApplications,
  fetchMyAuditorProfile,
  fetchMyOpportunities,
} from '../../api/portal'
import type { ApplicationDecision, AuditorOpportunity, MyApplication } from '../../api/types'
import { formatMoney } from '../../utils/format'
import { formatDate } from '../../utils/status'
import { EmptyState } from '../../components/dashboard/EmptyState'

type Tab = 'todas' | 'postulaciones' | 'guardadas'
type SortKey = 'relevantes' | 'fecha' | 'oferta-alta' | 'oferta-baja' | 'duracion' | 'compatibilidad'
type ViewMode = 'list' | 'grid'

const OPEN = ['published', 'has_interested', 'under_review']

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}
function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}

function statusOf(o: AuditorOpportunity): { label: string; tone: 'available' | 'applied' | 'closed' } {
  if (o.my_application?.decision === 'interested') return { label: 'Postulado', tone: 'applied' }
  if (o.my_application?.decision === 'not_available') return { label: 'No disponible', tone: 'closed' }
  return { label: 'Disponible', tone: 'available' }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'AF'
}

function compatInfo(o: AuditorOpportunity, certs: string[]): { pct: number; label: string; reasons: string[] } {
  const required = o.competencies.map((c) => c.competency.name)
  const matched = required.filter((n) => certs.includes(n))
  const pct = required.length ? Math.round((matched.length / required.length) * 100) : 0
  const label = pct >= 85 ? 'Alta compatibilidad' : pct >= 60 ? 'Compatibilidad media' : 'Baja compatibilidad'
  const reasons = [
    ...matched.map((n) => `Cuentas con certificación ${n}`),
    ...required.filter((n) => !certs.includes(n)).map((n) => `Falta cubrir ${n}`),
  ]
  return { pct, label, reasons }
}

function CompatRing({ pct }: { pct: number }) {
  const size = 44
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="mk-ring" title={`Compatibilidad ${pct}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6edf5" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={pct >= 85 ? '#16a34a' : pct >= 60 ? '#e99b2f' : '#dc2626'}
          strokeWidth={stroke}
          strokeDasharray={`${(pct / 100) * c} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="mk-ring-value">{pct}%</span>
    </div>
  )
}

interface SavedState {
  ids: number[]
  toggle: (id: number) => void
  has: (id: number) => boolean
}
function useSaved(): SavedState {
  const [ids, setIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('auditflow_saved') ?? '[]')
    } catch {
      return []
    }
  })
  const toggle = (id: number) =>
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      localStorage.setItem('auditflow_saved', JSON.stringify(next))
      return next
    })
  const has = (id: number) => ids.includes(id)
  return { ids, toggle, has }
}

interface Filters {
  state?: string
  offer?: string
  offerMax?: string
  dateFrom?: string
  dateTo?: string
  duration?: string
}

const DURATION_CATALOG = [
  { value: '1', label: '1 día' },
  { value: '2', label: '2 días' },
  { value: '3', label: '3 días' },
  { value: '5', label: '5 días' },
  { value: '7', label: '7 días' },
]

export function AuditorOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<AuditorOpportunity[]>([])
  const [applications, setApplications] = useState<MyApplication[]>([])
  const [assignmentCount, setAssignmentCount] = useState(0)
  const [certs, setCerts] = useState<string[]>([])
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('todas')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [sort, setSort] = useState<SortKey>('relevantes')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [advanced, setAdvanced] = useState(false)
  const [confirm, setConfirm] = useState<AuditorOpportunity | null>(null)
  const [help, setHelp] = useState(false)
  const [savingId, setSavingId] = useState<number | null>(null)
  const [toast, setToast] = useState('')
  const saved = useSaved()

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([fetchMyOpportunities(), fetchMyApplications(), fetchMyAssignments(), fetchMyAuditorProfile()])
      .then(([opps, apps, assigns, profile]) => {
        setOpportunities(opps)
        setApplications(apps)
        setAssignmentCount(assigns.length)
        setCerts(profile.competencies.filter((c) => c.is_valid).map((c) => c.competency.name))
        setRole((profile.roles ?? '').split(/[;,]/).map((s) => s.trim()).filter(Boolean).join(' · '))
        setLoading(false)
      })
      .catch((err) => {
        setError(getErrorMessage(err))
        setLoading(false)
      })
  }
  useEffect(load, [])

  const complete = useMemo(() => {
    const term = q.trim().toLowerCase()
    return opportunities.filter((o) => {
      const haystack = `${o.title} ${o.city ?? ''} ${o.state ?? ''} ${o.folio} ${o.competencies.map((c) => c.competency.name).join(' ')}`.toLowerCase()
      if (term && !haystack.includes(term)) return false
      if (filters.state && (o.state ?? '') !== filters.state) return false
      if (filters.dateFrom && o.start_date && o.start_date < filters.dateFrom) return false
      if (filters.dateTo && o.start_date && o.start_date > filters.dateTo) return false
      if (filters.offer && (o.payment_amount ?? 0) < Number(filters.offer)) return false
      if (filters.offerMax && (o.payment_amount ?? 0) > Number(filters.offerMax)) return false
      if (filters.duration && o.number_of_days !== Number(filters.duration)) return false
      return true
    })
  }, [opportunities, q, filters])

  const list = useMemo(() => {
    let rows = complete
    if (tab === 'postulaciones') rows = rows.filter((o) => o.my_application?.decision === 'interested')
    if (tab === 'guardadas') rows = rows.filter((o) => saved.has(o.id))
    return [...rows].sort((a, b) => {
      if (sort === 'fecha') return (a.start_date ?? '').localeCompare(b.start_date ?? '')
      if (sort === 'oferta-alta') return (b.payment_amount ?? 0) - (a.payment_amount ?? 0)
      if (sort === 'oferta-baja') return (a.payment_amount ?? 0) - (b.payment_amount ?? 0)
      if (sort === 'duracion') return a.number_of_days - b.number_of_days
      if (sort === 'compatibilidad') return compatInfo(b, certs).pct - compatInfo(a, certs).pct
      return compatInfo(b, certs).pct - compatInfo(a, certs).pct || (a.start_date ?? '').localeCompare(b.start_date ?? '')
    })
  }, [complete, tab, saved, sort, certs])

  const pageSize = 8
  const pageCount = Math.max(1, Math.ceil(list.length / pageSize))
  const pageRows = list.slice((page - 1) * pageSize, page * pageSize)
  const selected = opportunities.find((o) => o.id === selectedId) ?? null

  const stateOptions = useMemo(() => {
    const s = new Set<string>()
    for (const o of opportunities) if (o.state) s.add(o.state)
    return [...s].sort()
  }, [opportunities])

  const postuladas = applications.filter((a) => a.decision === 'interested').length

  const activeFilters = [filters.state, filters.offer, filters.offerMax, filters.dateFrom, filters.dateTo, filters.duration].filter(Boolean).length

  const activeChips: { key: string; label: string; clear?: Partial<Filters> }[] = []
  if (filters.state) activeChips.push({ key: 'state', label: filters.state })
  if (filters.duration) activeChips.push({ key: 'duration', label: `${filters.duration} días` })
  if (filters.offer) activeChips.push({ key: 'offer', label: `≥ $${Number(filters.offer).toLocaleString('es-MX')}` })
  if (filters.offerMax) activeChips.push({ key: 'offerMax', label: `≤ $${Number(filters.offerMax).toLocaleString('es-MX')}` })
  if (filters.dateFrom || filters.dateTo) activeChips.push({ key: 'dateFrom', label: `${filters.dateFrom ?? '…'} – ${filters.dateTo ?? '…'}`, clear: { dateFrom: undefined, dateTo: undefined } })

  const handleApply = async (opp: AuditorOpportunity, decision: ApplicationDecision) => {
    setSavingId(opp.id)
    setError('')
    try {
      await applyToOpportunity(opp.id, decision)
      setOpportunities((prev) =>
        prev.map((p) => (p.id === opp.id ? { ...p, my_application: { id: p.id, decision, comments: null, applied_at: new Date().toISOString() } } : p)),
      )
      setToast(decision === 'interested' ? '✓ Postulación enviada' : 'Marcado como no disponible')
      setConfirm(null)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSavingId(null)
    }
  }

  const kpis = [
    { label: 'Disponibles', sub: 'para tu perfil', value: opportunities.filter((o) => OPEN.includes(o.status)).length },
    { label: 'Guardadas', sub: 'Ver después', value: saved.ids.length },
    { label: 'Mis postulaciones', sub: 'En seguimiento', value: postuladas },
    { label: 'Asignaciones', sub: 'Confirmadas', value: assignmentCount },
  ]

  return (
    <div className="mk">
      <header className="mk-header">
        <div>
          <h2 className="oi-title">Oportunidades de auditoría</h2>
          <p className="oi-subtitle">Encuentra servicios que se ajusten a tu perfil, experiencia, competencias y disponibilidad.</p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHelp(true)}>¿Cómo funciona?</button>
      </header>

      <div className="mk-context">
        <span className="mk-context-label">Tu perfil</span>
        {role && <span className="mk-context-roles">{role}</span>}
        <span className="mk-context-count">{opportunities.filter((o) => OPEN.includes(o.status)).length} oportunidades compatibles</span>
      </div>

      <div className="mk-kpis">
        {kpis.map((k) => (
          <div className="mk-kpi" key={k.label}>
            <span className="mk-kpi-value">{k.value}</span>
            <span className="mk-kpi-label">{k.label}</span>
            <span className="mk-kpi-sub">{k.sub}</span>
          </div>
        ))}
      </div>

      <div className="mk-main">
        <input className="mk-search mk-search-big" placeholder="Buscar por puesto auditado, cliente, norma o ubicación…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />

        <div className="mk-quickfilters">
          <button type="button" className={`mk-chip mk-chip-btn ${activeFilters > 0 ? 'active' : ''}`} onClick={() => setAdvanced(true)}>
            {activeFilters > 0 ? `+ Filtros (${activeFilters})` : '+ Filtros'}
          </button>
        </div>

        {activeChips.length > 0 && (
          <div className="mk-activechips">
            {activeChips.map((c) => (
              <button key={c.key} type="button" className="mk-chip active" onClick={() => setFilters({ ...filters, [c.key]: undefined, ...(c.clear ?? {}) })}>
                {c.label} ×
              </button>
            ))}
            <button type="button" className="mk-chip mk-chip-btn" onClick={() => setFilters({})}>Limpiar todo</button>
          </div>
        )}

        <div className="mk-toolbar">
          <div className="mk-tabs" role="tablist">
            {([
              { key: 'todas', label: 'Todas', count: complete.length },
              { key: 'postulaciones', label: 'Mis postulaciones', count: complete.filter((o) => o.my_application?.decision === 'interested').length },
              { key: 'guardadas', label: 'Guardadas', count: complete.filter((o) => saved.has(o.id)).length },
            ] as { key: Tab; label: string; count: number }[]).map((t) => (
              <button key={t.key} type="button" className={`mk-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label} <span className="mk-tab-count">{t.count}</span>
              </button>
            ))}
          </div>
          <div className="mk-toolbar-right">
            <span className="mk-count">{list.length} {list.length === 1 ? 'oportunidad' : 'oportunidades'}</span>
            <label className="mk-sort-label">Ordenar:</label>
            <select className="mk-chip" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar">
              <option value="relevantes">Más relevantes</option>
              <option value="fecha">Fecha más próxima</option>
              <option value="oferta-alta">Mayor oferta</option>
              <option value="oferta-baja">Menor oferta</option>
              <option value="duracion">Menor duración</option>
              <option value="compatibilidad">Mayor compatibilidad</option>
            </select>
            <div className="mk-switch" role="tablist" aria-label="Vista">
              <button type="button" className={`mk-switch-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>Lista</button>
              <button type="button" className={`mk-switch-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Tarjetas</button>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          viewMode === 'list' ? (
            <div className="mk-list">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="oi-skeleton" style={{ height: 150, width: '100%' }} />)}</div>
          ) : (
            <div className="mk-grid-cards">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="oi-skeleton" style={{ height: 240, width: '100%' }} />)}</div>
          )
        ) : list.length === 0 ? (
          <EmptyState icon="◌" title="No encontramos oportunidades" description="Prueba modificando tus filtros o criterios de búsqueda." action={{ label: 'Limpiar filtros', onClick: () => { setFilters({}); setQ(''); setTab('todas') } }} />
        ) : viewMode === 'list' ? (
          <div className="mk-list">
            {pageRows.map((o) => (
              <OpportunityListItem key={o.id} o={o} certs={certs} selected={o.id === selected?.id} saved={saved.has(o.id)} onSave={() => saved.toggle(o.id)} onSelect={() => setSelectedId(o.id)} onApply={() => setConfirm(o)} />
            ))}
          </div>
        ) : (
          <div className="mk-grid-cards">
            {pageRows.map((o) => (
              <OpportunityCard key={o.id} o={o} certs={certs} saved={saved.has(o.id)} onSave={() => saved.toggle(o.id)} onSelect={() => setSelectedId(o.id)} onApply={() => setConfirm(o)} />
            ))}
          </div>
        )}

        {list.length > 0 && (
          <div className="mk-pagination">
            <span className="muted">Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, list.length)} de {list.length} oportunidades</span>
            <div className="mk-pages">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>←</button>
              {Array.from({ length: pageCount }).map((_, i) => <button key={i} type="button" className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
              <button type="button" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>→</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <OpportunityDetailDrawer o={selected} certs={certs} saved={saved.has(selected.id)} onSave={() => saved.toggle(selected.id)} onApply={() => setConfirm(selected)} onClose={() => setSelectedId(null)} />
      )}

      {advanced && <AdvancedFilters setFilters={(f) => { setFilters(f); setPage(1) }} filters={filters} stateOptions={stateOptions} count={complete.length} onClose={() => setAdvanced(false)} />}

      {toast && <div className="mk-toast">{toast}</div>}

      {confirm && <ConfirmModal o={confirm} saving={savingId === confirm.id} onCancel={() => setConfirm(null)} onConfirm={() => handleApply(confirm, 'interested')} />}

      {help && <HelpModal onClose={() => setHelp(false)} />}
    </div>
  )
}

function StatusBadge({ o }: { o: AuditorOpportunity }) {
  const st = statusOf(o)
  return <span className={`mk-status mk-status-${st.tone}`}>● {st.label}</span>
}

function Offer({ value }: { value: number | null }) {
  return <span className="mk-offer">{formatMoney(value)}</span>
}

function OpportunityListItem({ o, certs, selected, saved, onSave, onSelect, onApply }: { o: AuditorOpportunity; certs: string[]; selected: boolean; saved: boolean; onSave: () => void; onSelect: () => void; onApply: () => void }) {
  const st = statusOf(o)
  const compat = compatInfo(o, certs)
  return (
    <article className={`mk-row ${selected ? 'selected' : ''} ${saved ? 'saved' : ''}`} onClick={onSelect}>
      <div className="mk-row-brand" aria-hidden="true">{initials(o.title)}</div>
      <div className="mk-row-body">
        <div className="mk-row-top">
          <span className="mk-row-folio">{o.folio}</span>
          <StatusBadge o={o} />
        </div>
        <div className="mk-row-title">{o.title}</div>
        <div className="mk-row-client">Cliente confidencial</div>
        <div className="mk-row-meta">
          <span>📍 {[o.city, o.state].filter(Boolean).join(', ') || '—'}</span>
          <span>📅 {formatDate(o.start_date)} → {formatDate(o.end_date)}</span>
          <span>⏱ {o.number_of_days} días</span>
          <span>📋 {o.competencies.map((c) => c.competency.name).join(', ')}</span>
        </div>
        <div className="mk-row-norms">
          {o.competencies.map((c) => <span key={c.id} className="mk-norm">{c.competency.name} · {c.required_level}</span>)}
        </div>
      </div>
      <div className="mk-row-side">
        <div className="mk-row-offer">
          <span className="mk-offer-label">Oferta económica</span>
          <Offer value={o.payment_amount} />
          <span className="mk-offer-sub">Total del servicio</span>
        </div>
        <div className="mk-row-compat" title={compat.label}>
          <CompatRing pct={compat.pct} />
          <span className="mk-compat-label">{compat.label}</span>
        </div>
        <div className="mk-row-actions">
          <button type="button" className="mk-save" aria-label={saved ? 'Quitar de guardadas' : 'Guardar'} onClick={(e) => { e.stopPropagation(); onSave() }}>{saved ? '♥' : '♡'}</button>
          <button type="button" className={`btn ${st.tone === 'available' ? 'btn-primary' : 'btn-ghost'} btn-sm mk-apply`} disabled={st.tone !== 'available'} onClick={(e) => { e.stopPropagation(); onApply() }}>
            {st.tone === 'applied' ? 'Postulado ✓' : st.tone === 'closed' ? 'No disponible' : 'Postularme'}
          </button>
        </div>
      </div>
    </article>
  )
}

function OpportunityCard({ o, certs, saved, onSave, onSelect, onApply }: { o: AuditorOpportunity; certs: string[]; saved: boolean; onSave: () => void; onSelect: () => void; onApply: () => void }) {
  const st = statusOf(o)
  const compat = compatInfo(o, certs)
  return (
    <article className={`mk-card-g ${saved ? 'saved' : ''}`} onClick={onSelect} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onSelect()}>
      <div className="mk-card-top">
        <StatusBadge o={o} />
        <button type="button" className="mk-save" aria-label={saved ? 'Quitar de guardadas' : 'Guardar'} onClick={(e) => { e.stopPropagation(); onSave() }}>{saved ? '♥' : '♡'}</button>
      </div>
      <h3 className="mk-card-title">{o.title}</h3>
      <div className="mk-card-meta">
        <span>📍 {[o.city, o.state].filter(Boolean).join(', ') || '—'}</span>
        <span>📅 {formatDate(o.start_date)} → {formatDate(o.end_date)}</span>
        <span>⏱ {o.number_of_days} días</span>
      </div>
      <div className="mk-card-norms">{o.competencies.map((c) => <span key={c.id} className="mk-norm">{c.competency.name}</span>)}</div>
      <div className="mk-card-foot">
        <div><span className="mk-offer-label">Oferta económica</span><Offer value={o.payment_amount} /></div>
        <div className="mk-row-compat" title={compat.label}>
          <CompatRing pct={compat.pct} />
          <span className="mk-compat-label">{compat.label}</span>
        </div>
      </div>
      <button type="button" className={`btn ${st.tone === 'available' ? 'btn-primary' : 'btn-ghost'} btn-sm mk-apply`} disabled={st.tone !== 'available'} onClick={(e) => { e.stopPropagation(); onApply() }}>
        {st.tone === 'applied' ? 'Postulado ✓' : 'Postularme'}
      </button>
    </article>
  )
}

function OpportunityDetailDrawer({ o, certs, saved, onSave, onApply, onClose }: { o: AuditorOpportunity; certs: string[]; saved: boolean; onSave: () => void; onApply: () => void; onClose: () => void }) {
  const st = statusOf(o)
  const compat = compatInfo(o, certs)
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
        <StatusBadge o={o} />
        <h2 className="mk-detail-title">{o.title}</h2>
        <div className="mk-detail-client">Cliente confidencial</div>
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
            <div className="mk-detail-compat">
              <div className="mk-detail-compat-head">
                <div>
                  <span className="mk-section-label">Tu compatibilidad</span>
                  <div className="mk-compat-label">{compat.label}</div>
                </div>
                <CompatRing pct={compat.pct} />
              </div>
              <button type="button" className="mk-why" onClick={() => setTab('requisitos')}>¿Por qué?</button>
            </div>
          </>
        ) : (
          <>
            <span className="mk-section-label">Requisitos</span>
            <ul className="mk-req-list">{compat.reasons.map((r) => <li key={r}>✓ {r}</li>)}</ul>
            <div className="mk-detail-requirements">
              {o.competencies.map((c) => <span key={c.id} className="mk-norm">{c.competency.name} · {c.required_level}</span>)}
            </div>
          </>
        )}

        {o.description && <p className="oc-detail-desc">{o.description}</p>}

        <div className="mk-detail-actions">
          <button type="button" className="btn btn-ghost" onClick={onSave}>{saved ? '♥ Guardada' : '♡ Guardar'}</button>
          <button type="button" className="btn btn-primary mk-apply" disabled={st.tone !== 'available'} onClick={onApply}>
            {st.tone === 'applied' ? 'Postulado ✓' : 'Postularme'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdvancedFilters({ filters, setFilters, stateOptions, count, onClose }: { filters: Filters; setFilters: (f: Filters) => void; stateOptions: string[]; count: number; onClose: () => void }) {
  const set = (k: keyof Filters, v: string) => setFilters({ ...filters, [k]: v || undefined })
  const offerQuick = [
    { label: 'Hasta $25,000', min: '0', max: '25000' },
    { label: '$25,000 – $50,000', min: '25000', max: '50000' },
    { label: '$50,000 – $75,000', min: '50000', max: '75000' },
    { label: 'Más de $75,000', min: '75000', max: '' },
  ]
  const quickRanges = [
    { label: 'Próximos 7 días', days: 7 },
    { label: 'Próximos 30 días', days: 30 },
    { label: 'Próximos 90 días', days: 90 },
  ]
  const activeSummary: string[] = []
  if (filters.state) activeSummary.push(filters.state)
  if (filters.dateFrom || filters.dateTo) activeSummary.push(`${filters.dateFrom ?? '…'} – ${filters.dateTo ?? '…'}`)
  if (filters.offer) activeSummary.push(`≥ $${Number(filters.offer).toLocaleString('es-MX')}`)
  if (filters.offerMax) activeSummary.push(`≤ $${Number(filters.offerMax).toLocaleString('es-MX')}`)
  if (filters.duration) activeSummary.push(`${filters.duration} días`)
  return (
    <div className="mk-modal-overlay" onClick={onClose}>
      <div className="mk-drawer mk-adv" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Filtros">
        <div className="mk-drawer-head">
          <div>
            <h3 className="oi-panel-title">Filtros</h3>
            <p className="mk-adv-sub">Encuentra oportunidades que se adapten a ti.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="mk-adv-section">
          <span className="mk-section-label">📍 Lugar</span>
          <select className="mk-adv-select" value={filters.state ?? ''} onChange={(e) => set('state', e.target.value)}>
            <option value="">Cualquier ubicación</option>
            {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="mk-adv-section">
          <span className="mk-section-label">📅 Fechas (rango)</span>
          <div className="mk-adv-two">
            <input type="date" value={filters.dateFrom ?? ''} onChange={(e) => set('dateFrom', e.target.value)} aria-label="Fecha inicial" />
            <input type="date" value={filters.dateTo ?? ''} onChange={(e) => set('dateTo', e.target.value)} aria-label="Fecha final" />
          </div>
          <div className="mk-adv-quick">
            {quickRanges.map((r) => <button key={r.label} type="button" className="mk-chip" onClick={() => setFilters({ ...filters, dateFrom: todayIso(), dateTo: addDaysIso(r.days) })}>{r.label}</button>)}
          </div>
        </div>

        <div className="mk-adv-section">
          <span className="mk-section-label">💰 Oferta económica</span>
          <div className="mk-adv-two">
            <input type="number" placeholder="Mínimo" value={filters.offer ?? ''} onChange={(e) => set('offer', e.target.value)} aria-label="Oferta mínima" />
            <input type="number" placeholder="Máximo" value={filters.offerMax ?? ''} onChange={(e) => set('offerMax', e.target.value)} aria-label="Oferta máxima" />
          </div>
          <div className="mk-adv-quick">
            {offerQuick.map((o) => <button key={o.label} type="button" className="mk-chip" onClick={() => setFilters({ ...filters, offer: o.min || undefined, offerMax: o.max || undefined })}>{o.label}</button>)}
          </div>
        </div>

        <div className="mk-adv-section">
          <span className="mk-section-label">⏱ Duración</span>
          <select className="mk-adv-select" value={filters.duration ?? ''} onChange={(e) => set('duration', e.target.value)}>
            <option value="">Cualquier duración</option>
            {DURATION_CATALOG.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        {activeSummary.length > 0 && (
          <div className="mk-adv-active">
            <span className="mk-section-label">Filtros activos</span>
            <div className="mk-activechips">
              {activeSummary.map((s) => <span key={s} className="mk-chip active">{s}</span>)}
            </div>
          </div>
        )}

        <div className="mk-adv-footer">
          <button type="button" className="btn btn-ghost" onClick={() => setFilters({})}>Limpiar filtros</button>
          <button type="button" className="btn btn-primary" onClick={onClose}>Mostrar {count} oportunidades</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({ o, saving, onCancel, onConfirm }: { o: AuditorOpportunity; saving: boolean; onCancel: () => void; onConfirm: () => void }) {
  const st = statusOf(o)
  return (
    <div className="mk-modal-overlay" onClick={onCancel}>
      <div className="mk-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Confirmar postulación">
        <h3 className="oi-panel-title">¿Quieres postularte?</h3>
        <dl className="oc-drawer-rows">
          <div className="oc-drawer-row"><dt>Servicio</dt><dd>{o.title}</dd></div>
          <div className="oc-drawer-row"><dt>Ubicación</dt><dd>{[o.city, o.state].filter(Boolean).join(', ') || '—'}</dd></div>
          <div className="oc-drawer-row"><dt>Fecha</dt><dd>{formatDate(o.start_date)} → {formatDate(o.end_date)}</dd></div>
          <div className="oc-drawer-row"><dt>Oferta</dt><dd>{formatMoney(o.payment_amount)}</dd></div>
          <div className="oc-drawer-row"><dt>Estado</dt><dd>{st.label}</dd></div>
        </dl>
        <div className="row-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={onConfirm}>{saving ? 'Enviando…' : 'Confirmar postulación'}</button>
        </div>
      </div>
    </div>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  const steps = ['Encuentra una oportunidad.', 'Revisa fechas, requisitos y oferta.', 'Verifica tu compatibilidad.', 'Postúlate.', 'Consulta el estado de tu postulación.']
  return (
    <div className="mk-modal-overlay" onClick={onClose}>
      <div className="mk-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="¿Cómo funciona?">
        <h3 className="oi-panel-title">¿Cómo funciona?</h3>
        <ol className="mk-steps">{steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        <div className="row-actions"><button type="button" className="btn btn-primary" onClick={onClose}>Entendido</button></div>
      </div>
    </div>
  )
}
