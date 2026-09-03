import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCalendarData, type CalendarEventItem } from '../../hooks/useCalendarData'
import { resolveState } from '../../utils/mexico'
import { formatDate } from '../../utils/status'
import { EmptyState } from '../dashboard/EmptyState'

type View = 'month' | 'week' | 'day' | 'agenda'

const VIEWS: { key: View; label: string }[] = [
  { key: 'month', label: 'Mes' },
  { key: 'week', label: 'Semana' },
  { key: 'day', label: 'Día' },
  { key: 'agenda', label: 'Agenda' },
]

const TYPE_LABELS: Record<string, string> = { interno: 'Interno', externo: 'Externo' }

function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parse(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

function startOfWeek(d: Date): Date {
  const day = new Date(d)
  const diff = (day.getDay() + 6) % 7 // Lunes = 0
  day.setDate(day.getDate() - diff)
  day.setHours(0, 0, 0, 0)
  return day
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function short(value: string | Date): string {
  const d = typeof value === 'string' ? parse(value) : value
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function eventStatus(e: CalendarEventItem): { label: string; color: string } {
  if (e.status === 'confirmed') {
    if (e.oppStatus === 'in_progress') return { label: 'En ejecución', color: '#f59e0b' }
    if (['completed', 'invoice_received', 'paid'].includes(e.oppStatus))
      return { label: 'Finalizada', color: '#20a05a' }
    return { label: 'Confirmada', color: '#16a34a' }
  }
  if (e.oppStatus === 'assigned') return { label: 'Asignada', color: '#0f4f87' }
  return { label: 'Por confirmar', color: '#e99b2f' }
}

const LEGEND = [
  { label: 'Por confirmar', color: '#e99b2f' },
  { label: 'Asignada', color: '#0f4f87' },
  { label: 'Confirmada', color: '#16a34a' },
  { label: 'En ejecución', color: '#f59e0b' },
  { label: 'Finalizada', color: '#20a05a' },
  { label: 'Conflicto', color: '#dc2626' },
]

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function OperationalCalendar() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { events, availableAuditors, toAssign, loading, error, refetch } = useCalendarData()
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState<Date>(new Date())
  const [selected, setSelected] = useState<CalendarEventItem | null>(null)
  const [filters, setFilters] = useState<{
    status?: string
    auditorType?: string
    role?: string
    auditor?: string
    client?: string
    state?: string
    city?: string
  }>(() => {
    const s = searchParams.get('state')
    return s ? { state: s } : {}
  })
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filters.status && eventStatus(e).label !== filters.status) return false
      if (filters.auditorType && e.auditorType !== filters.auditorType) return false
      if (filters.role && !e.roles.includes(filters.role)) return false
      if (filters.auditor && e.auditorName !== filters.auditor) return false
      if (filters.client && e.client !== filters.client) return false
      if (filters.state) {
        const evState = resolveState(e.state ?? '')?.name ?? e.state ?? ''
        const filterState = resolveState(filters.state)?.name ?? filters.state
        if (evState !== filterState) return false
      }
      if (filters.city && e.city !== filters.city) return false
      return true
    })
  }, [events, filters])

  const conflictIds = useMemo(() => {
    const byAuditor = new Map<string, CalendarEventItem[]>()
    for (const e of events) {
      const arr = byAuditor.get(e.auditorName) ?? []
      arr.push(e)
      byAuditor.set(e.auditorName, arr)
    }
    const ids = new Set<number>()
    for (const [, arr] of byAuditor) {
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = parse(arr[i].startDate)
          const b = parse(arr[j].startDate)
          const ae = parse(arr[i].endDate)
          const be = parse(arr[j].endDate)
          if (a <= be && b <= ae) {
            ids.add(arr[i].id)
            ids.add(arr[j].id)
          }
        }
      }
    }
    return ids
  }, [events])

  const auditorNames = useMemo(() => {
    const s = new Set<string>()
    for (const e of events) s.add(e.auditorName)
    return [...s]
  }, [events])

  const clientNames = useMemo(() => {
    const s = new Set<string>()
    for (const e of events) if (e.client) s.add(e.client)
    return [...s].sort()
  }, [events])

  const stateNames = useMemo(() => {
    const s = new Set<string>()
    for (const e of events) if (e.state) s.add(e.state)
    return [...s].sort()
  }, [events])

  const cityNames = useMemo(() => {
    const s = new Set<string>()
    for (const e of events) if (e.city) s.add(e.city)
    return [...s].sort()
  }, [events])

  const ROLE_OPTIONS = ['Evaluador', 'Instructor', 'Examinador', 'Inspector']

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const now = new Date()
  const todayIso = iso(now)
  const detailEvent = selected ?? filtered[0] ?? null

  const navigation = (dir: number) => {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1))
    else if (view === 'week') setCursor(addDays(cursor, 7 * dir))
    else setCursor(addDays(cursor, dir))
  }

  const periodEvents = useMemo(() => {
    if (view === 'day') {
      const d = iso(cursor)
      return filtered.filter((e) => e.startDate <= d && e.endDate >= d)
    }
    if (view === 'week') {
      const s = startOfWeek(cursor)
      const e = iso(addDays(s, 6))
      return filtered.filter((ev) => ev.startDate <= e && ev.endDate >= iso(s))
    }
    if (view === 'month') {
      const m = cursor.getMonth()
      const y = cursor.getFullYear()
      return filtered.filter((ev) => {
        const d = parse(ev.startDate)
        return d.getMonth() === m && d.getFullYear() === y
      })
    }
    return filtered.filter((ev) => parse(ev.startDate) >= now)
  }, [filtered, view, cursor, now])

  const confirmed = periodEvents.filter((e) => e.status === 'confirmed').length
  const conflicts = periodEvents.filter((e) => conflictIds.has(e.id)).length

  const kpis = [
    { label: 'Auditorías del periodo', value: periodEvents.length, to: '/calendar' },
    { label: 'Confirmadas', value: confirmed, to: '/calendar' },
    { label: 'Por asignar', value: toAssign, to: '/opportunities' },
    { label: 'Conflictos', value: conflicts, to: '/calendar', danger: conflicts > 0 },
    { label: 'Auditores disponibles', value: availableAuditors, to: '/auditors' },
  ]

  const headers = useMemo(() => {
    if (view === 'day') return [dayLabel(cursor)]
    if (view === 'week') {
      const s = startOfWeek(cursor)
      return DAYS.map((label, i) => `${label} ${short(addDays(s, i))}`)
    }
    if (view === 'month') return [monthLabel(cursor)]
    return ['Agenda']
  }, [view, cursor])

  return (
    <div className="oc">
      <header className="oc-header">
        <div>
          <h2 className="oi-title">Calendario operacional</h2>
          <p className="oi-subtitle">Planificación y disponibilidad de servicios de auditoría.</p>
        </div>
        <div className="oc-controls">
          <button type="button" className="btn btn-ghost btn-sm oc-filter-btn" onClick={() => setShowFilters((s) => !s)}>
            Filtros{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date())}>
            Hoy
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigation(-1)} aria-label="Anterior">
            ←
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigation(1)} aria-label="Siguiente">
            →
          </button>
          <div className="oc-switcher" role="tablist" aria-label="Vista">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                className={`oc-switcher-btn ${view === v.key ? 'active' : ''}`}
                aria-selected={view === v.key}
                onClick={() => setView(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="oc-period">{headers.join(' · ')}</div>

      {showFilters && (
        <div className="oc-filters">
          <label>
            Estado
            <select value={filters.status ?? ''} onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}>
              <option value="">Todos</option>
              {LEGEND.map((l) => (
                <option key={l.label} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de auditor
            <select value={filters.auditorType ?? ''} onChange={(e) => setFilters({ ...filters, auditorType: e.target.value || undefined })}>
              <option value="">Todos</option>
              <option value="externo">Externo</option>
              <option value="interno">Interno</option>
            </select>
          </label>
          <label>
            Rol
            <select value={filters.role ?? ''} onChange={(e) => setFilters({ ...filters, role: e.target.value || undefined })}>
              <option value="">Todos</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label>
            Auditor
            <select value={filters.auditor ?? ''} onChange={(e) => setFilters({ ...filters, auditor: e.target.value || undefined })}>
              <option value="">Todos</option>
              {auditorNames.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cliente
            <select value={filters.client ?? ''} onChange={(e) => setFilters({ ...filters, client: e.target.value || undefined })}>
              <option value="">Todos</option>
              {clientNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado (ubicación)
            <select value={filters.state ?? ''} onChange={(e) => setFilters({ ...filters, state: e.target.value || undefined })}>
              <option value="">Todos</option>
              {stateNames.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ciudad
            <select value={filters.city ?? ''} onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })}>
              <option value="">Todas</option>
              {cityNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-sm oc-filter-clear"
            onClick={() => setFilters({})}
            disabled={activeFilterCount === 0}
          >
            Limpiar filtros
          </button>
        </div>
      )}

      <div className="oc-kpis">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            className={`oc-kpi ${k.danger ? 'oc-kpi-danger' : ''}`}
            onClick={() => navigate(k.to)}
          >
            <span className="oc-kpi-value">{k.value}</span>
            <span className="oc-kpi-label">{k.label}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="oc-empty">
          <EmptyState icon="!" title="No fue posible cargar el calendario." action={{ label: 'Reintentar', onClick: refetch }} />
        </div>
      ) : loading ? (
        <div className="oc-skeleton">
          <span className="oi-skeleton" style={{ height: 220, width: '100%' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="oc-empty">
          <EmptyState
            icon="◌"
            title="No hay auditorías programadas"
            description="No existen servicios programados para este periodo."
            action={{ label: 'Ver oportunidades', onClick: () => navigate('/opportunities') }}
          />
        </div>
      ) : (
        <div className="oc-layout">
          <div className="oc-main">
            <div className="oc-body">
              {view === 'month' && (
                <MonthView
                  events={filtered}
                  cursor={cursor}
                  today={todayIso}
                  conflictIds={conflictIds}
                  onSelect={setSelected}
                  onDayClick={(d) => {
                    setCursor(d)
                    setView('day')
                  }}
                />
              )}
              {view === 'week' && (
                <WeekView events={filtered} cursor={cursor} today={todayIso} conflictIds={conflictIds} onSelect={setSelected} />
              )}
              {view === 'day' && <DayView events={filtered} cursor={cursor} onSelect={setSelected} />}
              {view === 'agenda' && <AgendaView events={filtered} conflictIds={conflictIds} onSelect={setSelected} />}

              <div className="oc-legend">
                {LEGEND.map((l) => (
                  <span key={l.label} className="oc-legend-item">
                    <span className="oc-legend-dot" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>

              <div className="oc-bottom">
                <div className="oc-panel">
                  <h3 className="oi-panel-title">Carga de auditores</h3>
                  <AuditorWorkload events={events} />
                </div>
                <div className="oc-panel">
                  <h3 className="oi-panel-title">Próximos servicios</h3>
                  <UpcomingServices events={filtered} onSelect={setSelected} />
                </div>
              </div>
            </div>
          </div>

          <aside className="oc-side">
            <div className="oc-side-head">
              <h3 className="oi-panel-title">Detalle del servicio</h3>
              {selected && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                  ✕
                </button>
              )}
            </div>
            {detailEvent ? (
              <ServiceDetail event={detailEvent} conflict={conflictIds.has(detailEvent.id)} navigate={navigate} />
            ) : (
              <EmptyState icon="◌" title="Sin servicio seleccionado" description="Selecciona una auditoría para ver su detalle." />
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

function Chip({ e, conflict }: { e: CalendarEventItem; conflict: boolean }) {
  const st = conflict ? { label: 'Conflicto', color: '#dc2626' } : eventStatus(e)
  return (
    <div className="oc-chip">
      <span className="oc-chip-top">
        <span className="oc-chip-dot" style={{ background: st.color }} />
        <span className="oc-chip-folio">{e.folio}</span>
        {conflict && <span className="oc-chip-conflict">⚠</span>}
      </span>
      <span className="oc-chip-title">{e.title}</span>
      <span className="oc-chip-auditor">{e.auditorName}</span>
    </div>
  )
}

function MonthView({
  events,
  cursor,
  today,
  conflictIds,
  onSelect,
  onDayClick,
}: {
  events: CalendarEventItem[]
  cursor: Date
  today: string
  conflictIds: Set<number>
  onSelect: (e: CalendarEventItem) => void
  onDayClick: (d: Date) => void
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) cells.push(addDays(gridStart, i))

  return (
    <div className="oc-month-grid">
      {DAYS.map((d) => (
        <div key={d} className="oc-month-dow">
          {d}
        </div>
      ))}
      {cells.map((day, i) => {
        const d = iso(day)
        const inMonth = day.getMonth() === cursor.getMonth()
        const dayEvents = events.filter((e) => e.startDate === d)
        return (
          <div key={i} className={`oc-month-cell ${inMonth ? '' : 'out'} ${d === today ? 'today' : ''}`} onClick={() => onDayClick(day)}>
            <span className="oc-month-day">{day.getDate()}</span>
            <div className="oc-month-events">
              {dayEvents.slice(0, 2).map((e) => (
                <button key={e.id} type="button" className="oc-ev" onClick={(ev) => { ev.stopPropagation(); onSelect(e) }}>
                  <Chip e={e} conflict={conflictIds.has(e.id)} />
                </button>
              ))}
              {dayEvents.length > 2 && <span className="oc-month-more">+ {dayEvents.length - 2} servicios</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeekView({
  events,
  cursor,
  today,
  conflictIds,
  onSelect,
}: {
  events: CalendarEventItem[]
  cursor: Date
  today: string
  conflictIds: Set<number>
  onSelect: (e: CalendarEventItem) => void
}) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const auditorNames = Array.from(new Set(events.map((e) => e.auditorName)))
  return (
    <div className="oc-week">
      <div className="oc-week-head">
        <div className="oc-week-name" />
        {days.map((d) => (
          <div key={d.toISOString()} className={`oc-week-dow ${iso(d) === today ? 'today' : ''}`}>
            {d.toLocaleDateString('es-MX', { weekday: 'short' })} {d.getDate()}
          </div>
        ))}
      </div>
      {auditorNames.map((name) => {
        const listed = events.filter((e) => e.auditorName === name)
        return (
          <div key={name} className="oc-week-row">
            <div className="oc-week-name">{name}</div>
            <div className="oc-week-track">
              <div className="oc-week-cols">
                {days.map((d) => (
                  <div key={d.toISOString()} className="oc-week-col" />
                ))}
              </div>
              {listed.map((e) => {
                const s = parse(e.startDate)
                const e2 = parse(e.endDate)
                const c0 = Math.max(0, Math.round((s.getTime() - start.getTime()) / 86400000))
                const c1 = Math.min(6, Math.round((e2.getTime() - start.getTime()) / 86400000))
                const left = (c0 / 7) * 100
                const width = ((c1 - c0 + 1) / 7) * 100
                const conflict = conflictIds.has(e.id)
                const st = conflict ? { color: '#dc2626' } : eventStatus(e)
                return (
                  <button key={e.id} type="button" className="oc-ev-block" style={{ left: `${left}%`, width: `${width}%` }} onClick={() => onSelect(e)}>
                    <span className="oc-ev-block-bar" style={{ background: st.color }} />
                    <span className="oc-ev-block-title">{e.title}</span>
                    <span className="oc-ev-block-sub">{e.client ?? '—'} · {e.city ?? '—'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DayView({ events, cursor, onSelect }: { events: CalendarEventItem[]; cursor: Date; onSelect: (e: CalendarEventItem) => void }) {
  const d = iso(cursor)
  const dayEvents = events.filter((e) => e.startDate <= d && e.endDate >= d).sort((a, b) => a.folio.localeCompare(b.folio))
  return (
    <div className="oc-day">
      {dayEvents.length === 0 ? (
        <EmptyState icon="◌" title="Sin servicios en este día." description="No hay auditorías programadas para esta fecha." />
      ) : (
        dayEvents.map((e) => (
          <button key={e.id} type="button" className="oc-day-item" onClick={() => onSelect(e)}>
            <span className="oc-day-folio">{e.folio}</span>
            <span className="oc-day-title">{e.title}</span>
            <span className="oc-day-auditor">{e.auditorName} · {TYPE_LABELS[e.auditorType] ?? '—'}</span>
            <span className="oc-day-client">{e.client ?? '—'} · {[e.city, e.state].filter(Boolean).join(', ')}</span>
            <span className={`badge ${e.status === 'confirmed' ? 'badge-valid' : 'badge-busy'}`}>{e.status === 'confirmed' ? 'Confirmada' : 'Por confirmar'}</span>
          </button>
        ))
      )}
    </div>
  )
}

function AgendaView({ events, conflictIds, onSelect }: { events: CalendarEventItem[]; conflictIds: Set<number>; onSelect: (e: CalendarEventItem) => void }) {
  const groups = new Map<string, CalendarEventItem[]>()
  for (const e of events) {
    const k = e.startDate
    const arr = groups.get(k) ?? []
    arr.push(e)
    groups.set(k, arr)
  }
  const keys = [...groups.keys()].sort()
  return (
    <div className="oc-agenda">
      {keys.length === 0 ? (
        <EmptyState icon="◌" title="Sin servicios." description="No hay servicios programados." />
      ) : (
        keys.map((k) => (
          <div key={k} className="oc-agenda-group">
            <div className="oc-agenda-date">{short(k)}</div>
            {groups.get(k)!.map((e) => {
              const st = conflictIds.has(e.id) ? { label: 'Conflicto', color: '#dc2626' } : eventStatus(e)
              return (
                <button key={e.id} type="button" className="oc-agenda-item" onClick={() => onSelect(e)}>
                  <span className="oc-agenda-folio">{e.folio}</span>
                  <span className="oc-agenda-title">{e.title}</span>
                  <span className="oc-agenda-auditor">{e.auditorName} · {(e.roles.length ? e.roles.join(' · ') : TYPE_LABELS[e.auditorType])}</span>
                  <span className="oc-agenda-client">{e.client ?? '—'} · {[e.city, e.state].filter(Boolean).join(', ')}</span>
                  <span className="oc-agenda-dates">{short(e.startDate)} – {short(e.endDate)}</span>
                  <span className="oc-agenda-status" style={{ color: st.color }}>● {st.label}</span>
                </button>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}

function AuditorWorkload({ events }: { events: CalendarEventItem[] }) {
  const byName = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of events) {
      const days = Math.max(1, Math.round((parse(e.endDate).getTime() - parse(e.startDate).getTime()) / 86400000) + 1)
      m.set(e.auditorName, (m.get(e.auditorName) ?? 0) + days)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [events])
  const max = Math.max(1, ...byName.map(([, v]) => v))
  return (
    <div className="oc-load">
      {byName.length === 0 ? (
        <span className="muted">Sin carga asignada en el periodo.</span>
      ) : (
        byName.map(([name, days]) => (
          <div key={name} className="oc-load-row">
            <span className="oc-load-name">{name}</span>
            <div className="oc-load-track">
              <div className="oc-load-fill" style={{ width: `${(days / max) * 100}%` }} />
            </div>
            <span className="oc-load-days">{days} días</span>
          </div>
        ))
      )}
      <p className="oc-load-note">Carga estimada en días de servicio. No existe una fórmula oficial de capacidad.</p>
    </div>
  )
}

function UpcomingServices({ events, onSelect }: { events: CalendarEventItem[]; onSelect: (e: CalendarEventItem) => void }) {
  const [expanded, setExpanded] = useState(false)
  const now = new Date()
  const upcoming = [...events]
    .filter((e) => parse(e.startDate) >= now)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  const shown = expanded ? upcoming : upcoming.slice(0, 5)
  return (
    <div className="oc-upcoming">
      {shown.length === 0 ? (
        <span className="muted">Sin servicios próximos.</span>
      ) : (
        shown.map((e) => {
          const st = eventStatus(e)
          return (
            <button key={e.id} type="button" className="oc-upcoming-item" onClick={() => onSelect(e)}>
              <span className="oc-upcoming-date">{short(e.startDate)}</span>
              <span className="oc-upcoming-body">
                <span className="oc-upcoming-title">{e.title}</span>
                <span className="oc-upcoming-sub">{e.auditorName} · {e.client ?? '—'} · {e.city ?? '—'}</span>
              </span>
              <span className="oc-upcoming-status" style={{ color: st.color }}>● {st.label}</span>
            </button>
          )
        })
      )}
      {upcoming.length > 5 && (
        <button type="button" className="oc-upcoming-all" onClick={() => setExpanded((x) => !x)}>
          {expanded ? 'Mostrar menos ←' : `Ver todos los próximos servicios (${upcoming.length}) →`}
        </button>
      )}
    </div>
  )
}

function ServiceDetail({ event, conflict, navigate }: { event: CalendarEventItem; conflict: boolean; navigate: (to: string) => void }) {
  const st = conflict ? { label: 'Conflicto', color: '#dc2626' } : eventStatus(event)
  const rows = [
    ['Estado', st.label],
    ['Folio', event.folio],
    ['Servicio', event.title],
    ['Auditor', event.auditorName],
    ['Tipo', TYPE_LABELS[event.auditorType] ?? '—'],
    ['Rol', event.roles.length ? event.roles.join(', ') : '—'],
    ['Puesto auditado', event.title],
    ['Cliente', event.client ?? '—'],
    ['Ubicación', [event.city, event.state].filter(Boolean).join(', ') || '—'],
    ['Fechas', `${formatDate(event.startDate)} → ${formatDate(event.endDate)}`],
    ['Duración', `${Math.max(1, Math.round((parse(event.endDate).getTime() - parse(event.startDate).getTime()) / 86400000) + 1)} días`],
  ]
  return (
    <div className="oc-detail">
      <div className="oc-drawer-status" style={{ color: st.color }}>
        ● {st.label}
      </div>
      <dl className="oc-drawer-rows">
        {rows.map(([k, v]) => (
          <div className="oc-drawer-row" key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {event.description && <p className="oc-detail-desc">{event.description}</p>}
      <div className="oc-drawer-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/opportunities`)}>
          Ver servicio completo
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/clients')}>
          Ver cliente
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/auditors')}>
          Ver auditor
        </button>
      </div>
      {conflict && (
        <div className="oc-conflict-box">
          <strong>⚠ Conflicto</strong>
          <span>Este auditor tiene otra auditoría durante este periodo. Revisa las fechas superpuestas.</span>
        </div>
      )}
    </div>
  )
}
