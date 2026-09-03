import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../api/client'
import { addMyAvailability, fetchMyAvailability, removeMyAvailability } from '../../api/availability'
import { fetchMyCalendar } from '../../api/calendar'
import { fetchMyAssignments } from '../../api/assignments'
import type { AvailabilityBlock, CalendarEvent, MyAssignment } from '../../api/types'
import { formatMoney } from '../../utils/format'
import { formatDate } from '../../utils/status'
import { EmptyState } from '../../components/dashboard/EmptyState'

type View = 'month' | 'week' | 'day' | 'agenda'
const VIEWS: { key: View; label: string }[] = [
  { key: 'month', label: 'Mes' },
  { key: 'week', label: 'Semana' },
  { key: 'day', label: 'Día' },
  { key: 'agenda', label: 'Agenda' },
]
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface CalEvent {
  id: number
  type: 'assignment' | 'unavailability'
  title: string
  folio: string | null
  startDate: string
  endDate: string
  status: string | null
  client: string | null
  offer: number | null
}

const LEGEND = [
  { label: 'Confirmada', color: '#16a34a' },
  { label: 'Por confirmar', color: '#e99b2f' },
  { label: 'No disponible', color: '#dc2626' },
  { label: 'Vacaciones', color: '#7c5bd6' },
  { label: 'Bloqueo', color: '#94a3b8' },
]

const TYPE_LABELS: Record<string, string> = { vacations: 'Vacaciones', blocked: 'Bloqueo', unavailable: 'No disponible' }
const EMPTY_FORM = { start_date: '', end_date: '', availability_type: 'unavailable', notes: '' }

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function parse(v: string): Date {
  return new Date(`${v}T00:00:00`)
}
function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const diff = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - diff)
  x.setHours(0, 0, 0, 0)
  return x
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function short(v: string | Date): string {
  const d = typeof v === 'string' ? parse(v) : v
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}
function dayLabel(d: Date): string {
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function statusLabel(e: CalEvent): { label: string; color: string } {
  if (e.type === 'unavailability') return { label: TYPE_LABELS[e.status ?? 'unavailable'] ?? 'No disponible', color: e.status === 'vacations' ? '#7c5bd6' : e.status === 'blocked' ? '#94a3b8' : '#dc2626' }
  return e.status === 'confirmed' ? { label: 'Confirmada', color: '#16a34a' } : { label: 'Por confirmar', color: '#e99b2f' }
}

function buildEvents(
  cal: CalendarEvent[],
  assigns: MyAssignment[],
  blocks: AvailabilityBlock[],
): CalEvent[] {
  const assignById = new Map(assigns.map((a) => [a.id, a]))
  const events: CalEvent[] = []
  for (const e of cal) {
    if (e.type === 'assignment') {
      const a = assignById.get(e.id)
      events.push({
        id: e.id,
        type: 'assignment',
        title: e.title,
        folio: e.folio,
        startDate: e.start_date,
        endDate: e.end_date,
        status: e.status,
        client: a?.client?.commercial_name ?? a?.client?.business_name ?? null,
        offer: a?.payment_amount ?? null,
      })
    }
  }
  for (const b of blocks) {
    events.push({
      id: b.id,
      type: 'unavailability',
      title: b.notes || 'Indisponible',
      folio: null,
      startDate: b.start_date,
      endDate: b.end_date,
      status: b.availability_type,
      client: null,
      offer: null,
    })
  }
  return events
}

export function AuditorCalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState<Date>(new Date())
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([fetchMyCalendar(), fetchMyAssignments(), fetchMyAvailability()])
      .then(([cal, assigns, blk]) => {
        setEvents(buildEvents(cal, assigns, blk))
        setBlocks(blk)
        setLoading(false)
      })
      .catch((err) => {
        setError(getErrorMessage(err))
        setLoading(false)
      })
  }
  useEffect(load, [])

  const todayIso = iso(new Date())
  const selected = events.find((e) => e.id === selectedId) ?? null

  const periodEvents = useMemo(() => {
    if (view === 'day') {
      const d = iso(cursor)
      return events.filter((e) => e.startDate <= d && e.endDate >= d)
    }
    if (view === 'week') {
      const s = startOfWeek(cursor)
      const sIso = iso(s)
      const eIso = iso(addDays(s, 6))
      return events.filter((ev) => ev.startDate <= eIso && ev.endDate >= sIso)
    }
    if (view === 'month') {
      const m = cursor.getMonth()
      const y = cursor.getFullYear()
      return events.filter((ev) => parse(ev.startDate).getMonth() === m && parse(ev.startDate).getFullYear() === y)
    }
    return events.filter((ev) => parse(ev.startDate) >= new Date())
  }, [events, view, cursor])

  const confirmed = periodEvents.filter((e) => e.type === 'assignment' && e.status === 'confirmed').length
  const pending = periodEvents.filter((e) => e.type === 'assignment' && e.status !== 'confirmed').length
  const unavailDays = Math.max(0, events.filter((e) => e.type === 'unavailability').reduce((acc, e) => acc + Math.round((parse(e.endDate).getTime() - parse(e.startDate).getTime()) / 86400000) + 1, 0))

  const kpis = [
    { label: 'Mis servicios', value: events.filter((e) => e.type === 'assignment').length },
    { label: 'Confirmados', value: confirmed },
    { label: 'Por confirmar', value: pending },
    { label: 'Días no disponibles', value: unavailDays },
  ]

  const navigation = (dir: number) => {
    if (view === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1))
    else if (view === 'week') setCursor(addDays(cursor, 7 * dir))
    else setCursor(addDays(cursor, dir))
  }

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await addMyAvailability({ start_date: form.start_date, end_date: form.end_date, availability_type: form.availability_type, notes: form.notes.trim() || null })
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  const handleRemove = async (id: number) => {
    try {
      await removeMyAvailability(id)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="oc">
      <header className="oc-header">
        <div>
          <h2 className="oi-title">Mi calendario</h2>
          <p className="oi-subtitle">Planificación de mis servicios y disponibilidad.</p>
        </div>
        <div className="oc-controls">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date())}>Hoy</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigation(-1)} aria-label="Anterior">←</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigation(1)} aria-label="Siguiente">→</button>
          <div className="oc-switcher" role="tablist" aria-label="Vista">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" className={`oc-switcher-btn ${view === v.key ? 'active' : ''}`} onClick={() => setView(v.key)}>{v.label}</button>
            ))}
          </div>
        </div>
      </header>
      <div className="oc-period">{view === 'day' ? dayLabel(cursor) : view === 'month' ? monthLabel(cursor) : view === 'week' ? `${short(startOfWeek(cursor))} - ${short(addDays(startOfWeek(cursor), 6))}` : 'Agenda'}</div>

      <div className="oc-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="oc-kpi"><span className="oc-kpi-value">{k.value}</span><span className="oc-kpi-label">{k.label}</span></div>
        ))}
      </div>

      <div className="oc-layout">
        <div className="oc-main">
          {error && <div className="alert alert-error">{error}</div>}
          {loading ? (
            <div className="oc-skeleton"><span className="oi-skeleton" style={{ height: 240, width: '100%' }} /></div>
          ) : events.length === 0 ? (
            <EmptyState icon="◌" title="Sin servicios ni indisponibilidades." description="Cuando se te asigne un servicio o marques fechas, aparecerán aquí." />
          ) : (
            <>
              {view === 'month' && <MonthView events={periodEvents} cursor={cursor} today={todayIso} onSelect={setSelectedId} />}
              {view === 'week' && <WeekView events={periodEvents} cursor={cursor} today={todayIso} onSelect={setSelectedId} />}
              {view === 'day' && <DayView events={periodEvents} cursor={cursor} onSelect={setSelectedId} />}
              {view === 'agenda' && <AgendaView events={periodEvents} onSelect={setSelectedId} />}

              <div className="oc-legend">
                {LEGEND.map((l) => <span key={l.label} className="oc-legend-item"><span className="oc-legend-dot" style={{ background: l.color }} />{l.label}</span>)}
              </div>

              <div className="oc-bottom">
                <div className="oc-panel"><h3 className="oi-panel-title">Mi disponibilidad</h3><AvailabilityForm form={form} setForm={setForm} saving={saving} formError={formError} onAdd={handleAdd} /></div>
                <div className="oc-panel"><h3 className="oi-panel-title">Bloques de fechas</h3><BlocksList blocks={blocks} onRemove={handleRemove} /></div>
              </div>
            </>
          )}
        </div>

        <aside className="oc-side">
          <div className="oc-side-head"><h3 className="oi-panel-title">Detalle</h3>{selected && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedId(null)}>✕</button>}</div>
          {selected ? <DetailPanel e={selected} /> : <EmptyState icon="◌" title="Selecciona un evento" description="Elige un servicio o bloque para ver su detalle." />}
        </aside>
      </div>
    </div>
  )
}

function DetailPanel({ e }: { e: CalEvent }) {
  const st = statusLabel(e)
  const rows: [string, string][] = e.type === 'assignment'
    ? [
        ['Folio', e.folio ?? '—'],
        ['Cliente', e.client ?? '—'],
        ['Ubicación', '—'],
        ['Fechas', `${formatDate(e.startDate)} → ${formatDate(e.endDate)}`],
        ['Oferta', formatMoney(e.offer)],
        ['Estado', st.label],
      ]
    : [
        ['Fechas', `${formatDate(e.startDate)} → ${formatDate(e.endDate)}`],
        ['Tipo', st.label],
        ['Notas', e.title === 'Indisponible' ? '—' : e.title],
      ]
  return (
    <div className="mk-detail-panel">
      <div className="oc-drawer-status" style={{ color: st.color }}>● {st.label}</div>
      <h2 className="mk-detail-title">{e.title}</h2>
      <dl className="oc-drawer-rows">
        {rows.map(([k, v]) => <div className="oc-drawer-row" key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </div>
  )
}

function AvailabilityForm({ form, setForm, saving, formError, onAdd }: { form: typeof EMPTY_FORM; setForm: (f: typeof EMPTY_FORM) => void; saving: boolean; formError: string; onAdd: (e: FormEvent) => void }) {
  return (
    <form onSubmit={onAdd} className="form">
      <div className="form-row">
        <div><label htmlFor="av-start">Desde</label><input id="av-start" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
        <div><label htmlFor="av-end">Hasta</label><input id="av-end" type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
      </div>
      <label htmlFor="av-type">Tipo</label>
      <select id="av-type" value={form.availability_type} onChange={(e) => setForm({ ...form, availability_type: e.target.value })}>
        <option value="unavailable">No disponible</option>
        <option value="vacations">Vacaciones</option>
        <option value="blocked">Bloqueo</option>
      </select>
      <label htmlFor="av-notes">Notas (opcional)</label>
      <input id="av-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      {formError && <div className="alert alert-error">{formError}</div>}
      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar bloque'}</button>
    </form>
  )
}

function BlocksList({ blocks, onRemove }: { blocks: AvailabilityBlock[]; onRemove: (id: number) => void }) {
  if (blocks.length === 0) return <span className="muted">Sin bloques de fechas.</span>
  return (
    <ul className="oc-load">
      {blocks.map((b) => (
        <li key={b.id} className="oc-upcoming-item">
          <span className="oc-upcoming-date">{short(b.start_date)}</span>
          <span className="oc-upcoming-body"><span className="oc-upcoming-title">{TYPE_LABELS[b.availability_type] ?? b.availability_type}</span><span className="oc-upcoming-sub">{b.notes || '—'}</span></span>
          <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => onRemove(b.id)}>Quitar</button>
        </li>
      ))}
    </ul>
  )
}

function evColor(e: CalEvent): string {
  return statusLabel(e).color
}

function MonthView({ events, cursor, today, onSelect }: { events: CalEvent[]; cursor: Date; today: string; onSelect: (id: number) => void }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) cells.push(addDays(gridStart, i))
  return (
    <div className="oc-month-grid">
      {DAYS.map((d) => <div key={d} className="oc-month-dow">{d}</div>)}
      {cells.map((day, i) => {
        const d = iso(day)
        const inMonth = day.getMonth() === cursor.getMonth()
        const dayEvents = events.filter((e) => e.startDate <= d && e.endDate >= d)
        return (
          <div key={i} className={`oc-month-cell ${inMonth ? '' : 'out'} ${d === today ? 'today' : ''}`}>
            <span className="oc-month-day">{day.getDate()}</span>
            <div className="oc-month-events">
              {dayEvents.slice(0, 3).map((e) => (
                <button key={`${e.type}-${e.id}`} type="button" className="oc-ev" onClick={() => onSelect(e.id)}>
                  <span className="oc-chip"><span className="oc-chip-dot" style={{ background: evColor(e) }} /><span className="oc-chip-title">{e.title}</span></span>
                </button>
              ))}
              {dayEvents.length > 3 && <span className="oc-month-more">+ {dayEvents.length - 3}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeekView({ events, cursor, today, onSelect }: { events: CalEvent[]; cursor: Date; today: string; onSelect: (id: number) => void }) {
  const start = startOfWeek(cursor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  return (
    <div className="oc-week">
      <div className="oc-week-head"><div className="oc-week-name" />{days.map((d) => <div key={d.toISOString()} className={`oc-week-dow ${iso(d) === today ? 'today' : ''}`}>{d.toLocaleDateString('es-MX', { weekday: 'short' })} {d.getDate()}</div>)}</div>
      <div className="oc-week-row">
        <div className="oc-week-name">Mi agenda</div>
        <div className="oc-week-track">
          <div className="oc-week-cols">{days.map((d) => <div key={d.toISOString()} className="oc-week-col" />)}</div>
          {events.map((e) => {
            const c0 = Math.max(0, Math.round((parse(e.startDate).getTime() - start.getTime()) / 86400000))
            const c1 = Math.min(6, Math.round((parse(e.endDate).getTime() - start.getTime()) / 86400000))
            const left = (c0 / 7) * 100
            const width = ((c1 - c0 + 1) / 7) * 100
            return (
              <button key={`${e.type}-${e.id}`} type="button" className="oc-ev-block" style={{ left: `${left}%`, width: `${width}%` }} onClick={() => onSelect(e.id)}>
                <span className="oc-ev-block-bar" style={{ background: evColor(e) }} />
                <span className="oc-ev-block-title">{e.title}</span>
                {e.client && <span className="oc-ev-block-sub">{e.client}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function DayView({ events, cursor, onSelect }: { events: CalEvent[]; cursor: Date; onSelect: (id: number) => void }) {
  const d = iso(cursor)
  const dayEvents = events.filter((e) => e.startDate <= d && e.endDate >= d)
  return (
    <div className="oc-day">
      {dayEvents.length === 0 ? <EmptyState icon="◌" title="Sin eventos este día." description="No tienes servicios ni bloques para esta fecha." /> : dayEvents.map((e) => {
        const st = statusLabel(e)
        return (
          <button key={`${e.type}-${e.id}`} type="button" className="oc-day-item" onClick={() => onSelect(e.id)}>
            <span className="oc-day-folio">{e.folio ?? (e.type === 'unavailability' ? 'Dispon.' : '—')}</span>
            <span className="oc-day-title">{e.title}</span>
            <span className="oc-day-auditor">{e.client ?? TYPE_LABELS[e.status ?? ''] ?? ''}</span>
            <span className="oc-agenda-status" style={{ color: st.color }}>● {st.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function AgendaView({ events, onSelect }: { events: CalEvent[]; onSelect: (id: number) => void }) {
  const groups = new Map<string, CalEvent[]>()
  for (const e of events) {
    const k = e.startDate
    const arr = groups.get(k) ?? []
    arr.push(e)
    groups.set(k, arr)
  }
  return (
    <div className="oc-agenda">
      {groups.size === 0 ? <EmptyState icon="◌" title="Sin servicios." description="No hay servicios programados." /> : [...groups.keys()].sort().map((k) => (
        <div key={k} className="oc-agenda-group">
          <div className="oc-agenda-date">{short(k)}</div>
          {groups.get(k)!.map((e) => {
            const st = statusLabel(e)
            return (
              <button key={`${e.type}-${e.id}`} type="button" className="oc-agenda-item" onClick={() => onSelect(e.id)}>
                <span className="oc-agenda-folio">{e.folio ?? '—'}</span>
                <span className="oc-agenda-title">{e.title}</span>
                <span className="oc-agenda-auditor">{e.client ?? TYPE_LABELS[e.status ?? ''] ?? '—'}</span>
                <span className="oc-agenda-dates">{short(e.startDate)} – {short(e.endDate)}</span>
                <span className="oc-agenda-status" style={{ color: st.color }}>● {st.label}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
