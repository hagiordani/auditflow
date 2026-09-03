import type { ClientPerformance, ReportsSummary, TrendsResponse } from '../api/reports'
import type { AuditOpportunity, Auditor, OpportunityStatus, StaffCalendarEvent } from '../api/types'
import { resolveState } from './mexico'

export type Severity = 'danger' | 'warning' | 'info' | 'success'
type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger'

const EXECUTION: OpportunityStatus[] = ['assigned', 'confirmed', 'in_progress']
const AVAILABLE: OpportunityStatus[] = ['published', 'has_interested', 'under_review']

export interface KpiMetric {
  label: string
  value: number | string
  icon?: string
  hint?: string
  trend?: { direction: 'up' | 'down' | 'flat'; label: string } | null
  tone?: Tone
  to?: string
}

export interface AlertItem {
  severity: Severity
  message: string
  detail: string
  to?: string
}

export interface StageItem {
  label: string
  value: number
}

export interface ActiveAudit {
  assignmentId: number
  folio: string
  auditorName: string
  title: string
  clientName: string | null
  city: string | null
  state: string | null
  startDate: string | null
  endDate: string | null
  status: string
  oppStatus: string
  dayIndex: number | null
  totalDays: number
}

export interface UpcomingAudit {
  folio: string
  title: string
  clientName: string | null
  city: string | null
  state: string | null
  auditorName: string
  startDate: string
  status: string
}

function count(s: ReportsSummary, key: string): number {
  return ((s.opportunities_by_status as Record<string, number>)[key] ?? 0) as number
}

function iso(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function seriesTrend(
  cur: number,
  prev: number,
): { direction: 'up' | 'down' | 'flat'; label: string } | null {
  if (cur === 0 && prev === 0) return null
  if (prev <= 0) return { direction: 'up', label: 'Nuevo en el periodo' }
  const pct = Math.round(((cur - prev) / prev) * 100)
  return {
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
    label: `${pct > 0 ? '+' : ''}${pct}% vs periodo anterior`,
  }
}

/** KPIs operacionales basados exclusivamente en datos reales del summary. */
export function buildKpis(
  s: ReportsSummary,
  upcomingCount: number,
  availableAuditors: number,
  trends?: TrendsResponse | null,
): KpiMetric[] {
  const finalized = s.finalized
  const inExecution = s.in_execution
  const totalActive = finalized + inExecution
  const compliance = totalActive > 0 ? Math.round((finalized * 100) / totalActive) : 0
  const t = trends
  const created = t ? seriesTrend(t.current.created, t.previous.created) : null
  const assigned = t ? seriesTrend(t.current.assigned, t.previous.assigned) : null
  const completed = t ? seriesTrend(t.current.finalized, t.previous.finalized) : null

  return [
    {
      label: 'Servicios publicados',
      value: s.total_opportunities,
      icon: '▦',
      hint: 'Oportunidades en la operación',
      trend: created,
      tone: 'primary',
      to: '/opportunities',
    },
    {
      label: 'Pendientes de asignación',
      value: s.available,
      icon: '◧',
      hint: 'Publicadas y en revisión',
      trend: created,
      tone: 'default',
      to: '/opportunities',
    },
    {
      label: 'En ejecución',
      value: count(s, 'in_progress'),
      icon: '◉',
      hint: 'Auditorías en curso',
      trend: assigned,
      tone: 'success',
      to: '/opportunities',
    },
    {
      label: 'Próximas auditorías',
      value: upcomingCount,
      icon: '◷',
      hint: 'Próximos 30 días',
      trend: assigned,
      tone: 'default',
      to: '/calendar',
    },
    {
      label: 'Cumplimiento',
      value: `${compliance}%`,
      icon: '✓',
      hint: 'Finalizadas del flujo activo',
      trend: completed,
      tone: compliance >= 90 ? 'success' : compliance >= 70 ? 'warning' : 'danger',
      to: '/opportunities',
    },
    {
      label: 'Auditores activos',
      value: s.active_auditors,
      icon: '♙',
      hint: `${availableAuditors} disponibles`,
      trend: assigned,
      tone: 'default',
      to: '/auditors',
    },
  ]
}

/** Centro de atención: situaciones reales que requieren intervención. */
export function buildAlerts(s: ReportsSummary, opportunities: AuditOpportunity[]): AlertItem[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const alerts: AlertItem[] = []

  if (s.available > 0) {
    alerts.push({
      severity: 'warning',
      message: `${s.available} servicios pendientes de asignación`,
      detail: 'Publicados y en revisión, sin auditor asignado.',
      to: '/opportunities',
    })
  }
  if (s.pending_confirmations > 0) {
    alerts.push({
      severity: 'warning',
      message: `${s.pending_confirmations} asignaciones esperando confirmación`,
      detail: 'El auditor debe confirmar para que arranque el servicio.',
      to: '/opportunities',
    })
  }
  if (s.expiring_certifications_60d > 0) {
    alerts.push({
      severity: 'warning',
      message: `${s.expiring_certifications_60d} certificaciones vencen en 60 días`,
      detail: 'Revisa la vigencia de competencias de los auditores.',
      to: '/auditors',
    })
  }

  const overdue = opportunities.filter(
    (o) =>
      EXECUTION.includes(o.status) &&
      o.end_date &&
      iso(o.end_date)! < today &&
      o.status !== 'completed',
  )
  if (overdue.length > 0) {
    alerts.push({
      severity: 'danger',
      message: `${overdue.length} auditorías con fecha de fin vencida`,
      detail: 'En ejecución o asignadas con retraso.',
      to: '/opportunities',
    })
  }

  const soonNoCoverage = opportunities
    .filter((o) => AVAILABLE.includes(o.status) && o.start_date && iso(o.start_date)! >= today)
    .filter((o) => {
      const start = iso(o.start_date)!
      const diff = Math.round((start.getTime() - today.getTime()) / 86400000)
      return diff <= 7
    })
  if (soonNoCoverage.length > 0) {
    alerts.push({
      severity: 'warning',
      message: `${soonNoCoverage.length} servicios inician pronto sin auditor asignado`,
      detail: 'Inician en los próximos 7 días y aún no tienen cobertura.',
      to: '/opportunities',
    })
  }

  const order: Record<Severity, number> = { danger: 0, warning: 1, info: 2, success: 3 }
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 5)
}

/** Flujo operacional: Publicadas → Postulaciones/Asignación → En ejecución → Finalizadas. */
export function buildStages(s: ReportsSummary): StageItem[] {
  return [
    {
      label: 'Publicadas',
      value: count(s, 'published') + count(s, 'has_interested') + count(s, 'under_review'),
    },
    { label: 'Postulaciones / Asignación', value: count(s, 'assigned') + count(s, 'confirmed') },
    { label: 'En ejecución', value: count(s, 'in_progress') },
    {
      label: 'Finalizadas',
      value: count(s, 'completed') + count(s, 'invoice_received') + count(s, 'paid'),
    },
  ]
}

function joinAudits(
  calendar: StaffCalendarEvent[],
  opportunities: AuditOpportunity[],
): ActiveAudit[] {
  const oppByFolio = new Map(opportunities.map((o) => [o.folio, o]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return calendar
    .map((e) => {
      const opp = oppByFolio.get(e.folio)
      const start = iso(opp?.start_date)
      const end = iso(opp?.end_date)
      const totalDays = opp?.number_of_days ?? (end && start ? Math.round((end.getTime() - start.getTime()) / 86400000) + 1 : 0)
      let dayIndex: number | null = null
      if (start && end) {
        const diff = Math.round((today.getTime() - start.getTime()) / 86400000) + 1
        dayIndex = diff >= 1 ? Math.min(diff, totalDays) : null
      }
      return {
        assignmentId: e.assignment_id,
        folio: e.folio,
        auditorName: e.auditor_name,
        title: e.title,
        clientName: opp?.client?.commercial_name ?? opp?.client?.business_name ?? null,
        city: e.city,
        state: e.state,
        startDate: opp?.start_date ?? null,
        endDate: opp?.end_date ?? null,
        status: e.status,
        oppStatus: opp?.status ?? '',
        dayIndex,
        totalDays,
      }
    })
    .filter((a) => a.folio)
}

/** Auditores activos en este momento (servicios en ejecución). */
export function buildActiveAudits(
  calendar: StaffCalendarEvent[],
  opportunities: AuditOpportunity[],
): ActiveAudit[] {
  const audits = joinAudits(calendar, opportunities)
  const oppByFolio = new Map(opportunities.map((o) => [o.folio, o]))
  const inProgress = audits.filter((a) => oppByFolio.get(a.folio)?.status === 'in_progress')
  return inProgress
}

/** Próximas auditorías ordenadas por fecha de inicio (próximos 30 días). */
export function buildUpcoming(
  calendar: StaffCalendarEvent[],
  opportunities: AuditOpportunity[],
  days = 30,
): UpcomingAudit[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const horizon = new Date(today)
  horizon.setDate(horizon.getDate() + days)

  return joinAudits(calendar, opportunities)
    .filter((a) => ['assigned', 'confirmed'].includes(a.oppStatus))
    .filter((a) => {
      const start = iso(a.startDate)
      return !!start && start >= today && start <= horizon
    })
    .sort((a, b) => (a.startDate! < b.startDate! ? -1 : 1))
    .slice(0, 6)
    .map((a) => ({
      folio: a.folio,
      title: a.title,
      clientName: a.clientName,
      city: a.city,
      state: a.state,
      auditorName: a.auditorName,
      startDate: a.startDate ?? '',
      status: a.status,
    }))
}

export interface ClientCard {
  clientId: number
  name: string
  businessName: string
  audits: number
  active: number
  finalized: number
  compliancePct: number
  lastAudit: string | null
}

/** Rendimiento de clientes como lista vertical de contenedores (con última auditoría). */
export function buildClientCards(
  clients: ClientPerformance[],
  opportunities: AuditOpportunity[],
): ClientCard[] {
  const byClient = new Map<number, AuditOpportunity[]>()
  for (const o of opportunities) {
    if (!o.client) continue
    const arr = byClient.get(o.client.id) ?? []
    arr.push(o)
    byClient.set(o.client.id, arr)
  }
  return clients
    .map((c) => {
      const opps = byClient.get(c.client_id) ?? []
      const lastAudit = opps.reduce<string | null>((acc, o) => {
        const key = o.start_date ?? o.created_at ?? ''
        return !key || (acc && key < acc) ? acc : key
      }, null)
      return {
        clientId: c.client_id,
        name: c.name,
        businessName: c.business_name,
        audits: c.audits,
        active: c.active,
        finalized: c.finalized,
        compliancePct: c.compliance_pct,
        lastAudit,
      }
    })
    .sort((a, b) => b.audits - a.audits)
}

export interface StateStatusBucket {
  label: string
  value: number
  color: string
}

export interface StateStatusRow {
  state: string
  total: number
  buckets: StateStatusBucket[]
}

const STATUS_BUCKETS: { label: string; statuses: OpportunityStatus[]; color: string }[] = [
  { label: 'Borrador', statuses: ['draft'], color: '#94a3b8' },
  { label: 'Pendientes', statuses: ['published', 'has_interested', 'under_review'], color: '#0ea5e9' },
  { label: 'Asignadas', statuses: ['assigned', 'confirmed'], color: '#0f4f87' },
  { label: 'En ejecución', statuses: ['in_progress'], color: '#f59e0b' },
  { label: 'Finalizadas', statuses: ['completed', 'invoice_received', 'paid'], color: '#16a34a' },
  { label: 'Canceladas', statuses: ['cancelled'], color: '#dc2626' },
]

/** Distribución de servicios por estado (de la república) y por estatus. */
export function buildStateStatus(opportunities: AuditOpportunity[]): StateStatusRow[] {
  const byState = new Map<string, StateStatusRow>()
  for (const o of opportunities) {
    const st = (o.state ?? '').trim()
    if (!st) continue
    let row = byState.get(st)
    if (!row) {
      row = {
        state: st,
        total: 0,
        buckets: STATUS_BUCKETS.map((b) => ({ label: b.label, value: 0, color: b.color })),
      }
      byState.set(st, row)
    }
    row.total += 1
    const idx = STATUS_BUCKETS.findIndex((b) => b.statuses.includes(o.status))
    if (idx >= 0) row.buckets[idx].value += 1
  }
  return [...byState.values()].sort((a, b) => b.total - a.total)
}

const GEO_BUCKETS: { label: string; statuses: OpportunityStatus[]; color: string }[] = [
  { label: 'Pendientes', statuses: ['published', 'has_interested', 'under_review'], color: '#0ea5e9' },
  { label: 'Asignadas', statuses: ['assigned', 'confirmed'], color: '#0f4f87' },
  { label: 'En ejecución', statuses: ['in_progress'], color: '#f59e0b' },
  { label: 'Finalizadas', statuses: ['completed', 'invoice_received', 'paid'], color: '#16a34a' },
]

export interface GeoAuditor {
  name: string
  type: string
  specialty: string | null
  roles: string[]
  puesto: string
  client: string | null
  city: string | null
  state: string | null
  startDate: string | null
  endDate: string | null
  oppStatus: string
  statusLabel: string
}

export interface GeoState {
  state: string
  total: number
  buckets: StateStatusBucket[]
  auditors: GeoAuditor[]
}

export interface GeoSummary {
  totalAuditorias: number
  estadosConActividad: number
  auditoresEnMovimiento: number
  coberturaGeografica: number
}

function geoStatusLabel(oppStatus: string): string {
  if (oppStatus === 'in_progress') return 'En ejecución'
  if (oppStatus === 'assigned') return 'Asignada'
  return 'Próxima'
}

/** Bloque geográfico: por estado → estatus (buckets) y auditores en ese estado. */
export function buildGeoModel(
  opportunities: AuditOpportunity[],
  calendar: StaffCalendarEvent[],
  auditors: Auditor[],
): { states: GeoState[]; summary: GeoSummary } {
  const info = new Map<string, { type: string; specialty: string | null; roles: string[] }>()
  for (const a of auditors) {
    info.set(a.full_name, {
      type: a.auditor_type,
      specialty: a.specialty,
      roles: (a.roles ?? '').split(/[;,]/).map((s) => s.trim()).filter(Boolean),
    })
  }
  const oppByFolio = new Map(opportunities.map((o) => [o.folio, o]))
  const states = new Map<string, GeoState>()
  const getState = (name: string): GeoState => {
    let s = states.get(name)
    if (!s) {
      s = {
        state: name,
        total: 0,
        buckets: GEO_BUCKETS.map((b) => ({ label: b.label, value: 0, color: b.color })),
        auditors: [],
      }
      states.set(name, s)
    }
    return s
  }

  for (const o of opportunities) {
    const st = (o.state ?? '').trim()
    if (!st) continue
    const name = resolveState(st)?.name ?? st
    const bi = GEO_BUCKETS.findIndex((b) => b.statuses.includes(o.status))
    if (bi < 0) continue
    const s = getState(name)
    s.total += 1
    s.buckets[bi].value += 1
  }

  for (const e of calendar) {
    const opp = oppByFolio.get(e.folio)
    if (!opp || !['assigned', 'confirmed', 'in_progress'].includes(opp.status)) continue
    const st = (opp.state ?? '').trim()
    if (!st) continue
    const name = resolveState(st)?.name ?? st
    const meta = info.get(e.auditor_name)
    getState(name).auditors.push({
      name: e.auditor_name,
      type: meta?.type ?? 'externo',
      specialty: meta?.specialty ?? null,
      roles: meta?.roles ?? [],
      puesto: opp.title,
      client: opp.client?.commercial_name ?? opp.client?.business_name ?? null,
      city: opp.city,
      state: opp.state,
      startDate: opp.start_date,
      endDate: opp.end_date,
      oppStatus: opp.status,
      statusLabel: geoStatusLabel(opp.status),
    })
  }

  const estadosConActividad = states.size
  return {
    states: [...states.values()].sort((a, b) => b.total - a.total),
    summary: {
      totalAuditorias: opportunities.length,
      estadosConActividad,
      auditoresEnMovimiento: new Set(calendar.map((e) => e.auditor_name)).size,
      coberturaGeografica: Math.round((estadosConActividad / 32) * 100),
    },
  }
}
