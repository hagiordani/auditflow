import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { fetchMyAssignments } from '../../api/assignments'
import { fetchMyApplications, fetchMyAuditorProfile, fetchMyOpportunities } from '../../api/portal'
import { fetchAuditorSummary } from '../../api/reports'
import type {
  Auditor,
  AuditorOpportunity,
  MyApplication,
  MyAssignment,
} from '../../api/types'
import { formatMoney } from '../../utils/format'
import { formatDate } from '../../utils/status'
import { useAuth } from '../../context/AuthContext'
import { EmptyState } from '../../components/dashboard/EmptyState'
import {
  AlertTriangle,
  ArrowRight,
  BadgeAlert,
  Bookmark,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Check,
  ClipboardCheck,
  Clock3,
  MapPin,
  Send,
} from '../../components/AuditorHomeIcons'

const OPEN = ['published', 'has_interested', 'under_review']

function statusOf(o: AuditorOpportunity): { label: string; tone: 'available' | 'applied' | 'closed' } {
  if (o.my_application?.decision === 'interested') return { label: 'Postulado', tone: 'applied' }
  if (o.my_application?.decision === 'not_available') return { label: 'No disponible', tone: 'closed' }
  return { label: 'Disponible', tone: 'available' }
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function monthDay(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase()
}

function shortRange(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase()
}

function daysUntil(iso: string | null | undefined): number {
  if (!iso) return Infinity
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return Infinity
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000)
  return diff
}

function relativeDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ayer'
  if (days < 30) return `Hace ${days} días`
  return formatDate(iso)
}

function useSaved() {
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
  return { toggle, has }
}

interface ActivityEntry {
  kind: 'assignment' | 'application'
  id: string
  title: string
  subtitle: string
  time: string
  sort: number
}

interface ProfileCheck {
  label: string
  ok: boolean
}

export function AuditorHomePage() {
  const { user } = useAuth()
  const [auditor, setAuditor] = useState<Auditor | null>(null)
  const [opportunities, setOpportunities] = useState<AuditorOpportunity[]>([])
  const [applications, setApplications] = useState<MyApplication[]>([])
  const [assignments, setAssignments] = useState<MyAssignment[]>([])
  const [summary, setSummary] = useState<{ occupied_days: number; expiring_my_certifications_90d: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const saved = useSaved()

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      fetchMyAuditorProfile(),
      fetchMyOpportunities(),
      fetchMyApplications(),
      fetchMyAssignments(),
      fetchAuditorSummary(),
    ])
      .then(([prof, opps, apps, assigns, sum]) => {
        if (!active) return
        setAuditor(prof)
        setOpportunities(opps)
        setApplications(apps)
        setAssignments(assigns)
        setSummary(sum)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(getErrorMessage(err))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const firstName = (user?.full_name ?? '').trim().split(/\s+/)[0] || ''
  const available = opportunities.filter((o) => OPEN.includes(o.status)).length
  const postuladas = applications.filter((a) => a.decision === 'interested').length

  const nextAudit = useMemo(() => {
    const upcoming = assignments
      .filter((a) => a.status === 'confirmed' || a.status === 'pending')
      .filter((a) => a.opportunity.start_date)
      .filter((a) => daysUntil(a.opportunity.start_date) >= -2)
      .sort((a, b) => (a.opportunity.start_date ?? '').localeCompare(b.opportunity.start_date ?? ''))
    return upcoming[0] ?? null
  }, [assignments])

  const topOpps = useMemo(() => [...opportunities].slice(0, 2), [opportunities])

  const activity = useMemo<ActivityEntry[]>(() => {
    const entries: ActivityEntry[] = []
    for (const a of assignments) {
      if (a.status === 'confirmed' && a.confirmed_at) {
        entries.push({
          kind: 'assignment',
          id: `a-${a.id}`,
          title: 'Asignación confirmada',
          subtitle: a.opportunity.title,
          time: relativeDate(a.confirmed_at),
          sort: new Date(a.confirmed_at).getTime(),
        })
      }
    }
    for (const ap of applications) {
      entries.push({
        kind: 'application',
        id: `ap-${ap.id}`,
        title: 'Postulación enviada',
        subtitle: ap.opportunity.title,
        time: relativeDate(ap.applied_at),
        sort: new Date(ap.applied_at).getTime(),
      })
    }
    return entries.sort((x, y) => y.sort - x.sort).slice(0, 6)
  }, [assignments, applications])

  const profileChecks = useMemo<ProfileCheck[]>(() => {
    if (!auditor) return []
    const validCerts = auditor.competencies.filter((c) => c.is_valid).length
    const hasCompetencies = auditor.competencies.length > 0
    const hasInfo = !!(auditor.specialty || auditor.city || auditor.state || auditor.phone || (auditor.roles ?? '').trim())
    const availOk = auditor.availability_status === 'available'
    return [
      { label: 'Perfil profesional', ok: hasInfo },
      { label: 'Competencias', ok: hasCompetencies },
      { label: 'Certificaciones', ok: validCerts > 0 },
      { label: 'Disponibilidad', ok: availOk },
    ]
  }, [auditor])

  const profilePct = useMemo(() => {
    if (!auditor) return 0
    const fields = [
      !!auditor.phone,
      !!auditor.city,
      !!auditor.state,
      !!auditor.specialty,
      !!(auditor.roles ?? '').trim(),
      !!auditor.daily_rate,
      auditor.competencies.length > 0,
      auditor.competencies.some((c) => c.is_valid),
      auditor.availability_status === 'available',
    ]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }, [auditor])

  const retry = () => {
    setLoading(true)
    setError('')
    Promise.all([
      fetchMyAuditorProfile(),
      fetchMyOpportunities(),
      fetchMyApplications(),
      fetchMyAssignments(),
      fetchAuditorSummary(),
    ])
      .then(([prof, opps, apps, assigns, sum]) => {
        setAuditor(prof)
        setOpportunities(opps)
        setApplications(apps)
        setAssignments(assigns)
        setSummary(sum)
        setLoading(false)
      })
      .catch((err) => {
        setError(getErrorMessage(err))
        setLoading(false)
      })
  }

  return (
    <div className="ah">
      <header className="ah-header">
        <div>
          <h1 className="ah-greeting">{greeting()}, {firstName} 👋</h1>
          <p className="ah-sub">Aquí tienes lo más importante de tu actividad en AuditFlow.</p>
        </div>
        <Link to="/auditor/opportunities" className="btn btn-primary">Explorar oportunidades →</Link>
      </header>

      {error && (
        <div className="ah-error">
          <EmptyState icon="!" title="No pudimos cargar tu centro de control." description="Revisa la conexión e inténtalo de nuevo." action={{ label: 'Reintentar', onClick: retry }} />
        </div>
      )}

      {loading && <AuditorHomeSkeleton />}

      {!loading && !error && (
        <>
          <div className="ah-summary">
            <Link to="/auditor/opportunities" className="ah-stat">
              <span className="ah-stat-icon" aria-hidden="true"><BriefcaseBusiness /></span>
              <span className="ah-stat-value">{available}</span>
              <span className="ah-stat-label">Oportunidades compatibles</span>
              <span className="ah-stat-sub">Con tu perfil</span>
              <span className="ah-stat-link">Ver oportunidades <ArrowRight width={13} height={13} /></span>
            </Link>

            <Link to="/auditor/applications" className="ah-stat">
              <span className="ah-stat-icon" aria-hidden="true"><ClipboardCheck /></span>
              <span className="ah-stat-value">{postuladas}</span>
              <span className="ah-stat-label">Postulaciones</span>
              <span className="ah-stat-sub">En seguimiento</span>
              <span className="ah-stat-link">Ver postulaciones <ArrowRight width={13} height={13} /></span>
            </Link>

            <div className={`ah-next ${nextAudit ? '' : 'empty'}`}>
              <span className="ah-next-label"><CalendarClock width={16} height={16} /> Próxima auditoría</span>
              {nextAudit ? (
                <>
                  <div className="ah-next-date">{monthDay(nextAudit.opportunity.start_date)}<span>{daysUntil(nextAudit.opportunity.start_date) <= 0 ? 'Hoy' : `En ${daysUntil(nextAudit.opportunity.start_date)} ${daysUntil(nextAudit.opportunity.start_date) === 1 ? 'día' : 'días'}`}</span></div>
                  <div className="ah-next-title">{nextAudit.opportunity.title}</div>
                  <div className="ah-next-meta">
                    <span><MapPin width={13} height={13} /> {[nextAudit.client?.city ?? nextAudit.opportunity.city, nextAudit.client?.state ?? nextAudit.opportunity.state].filter(Boolean).join(', ') || '—'}</span>
                    <span><Clock3 width={13} height={13} /> {nextAudit.opportunity.number_of_days} días · {shortRange(nextAudit.opportunity.start_date)}–{shortRange(nextAudit.opportunity.end_date)}</span>
                  </div>
                  <div className="ah-next-offer">{formatMoney(nextAudit.payment_amount)}<span>Total del servicio</span></div>
                  <Link to="/auditor/assignments" className="ah-next-link">Ver auditoría <ArrowRight width={13} height={13} /></Link>
                </>
              ) : (
                <div className="ah-next-empty">No tienes auditorías próximas.</div>
              )}
            </div>

            <Link to="/auditor/calendar" className="ah-stat">
              <span className="ah-stat-icon" aria-hidden="true"><CalendarRange /></span>
              <span className="ah-stat-value">{summary?.occupied_days ?? 0}</span>
              <span className="ah-stat-label">Días ocupados</span>
              <span className="ah-stat-sub">Este mes</span>
              <span className="ah-stat-link">Ver calendario <ArrowRight width={13} height={13} /></span>
            </Link>

            <Link to="/auditor/profile" className="ah-stat">
              <span className={`ah-stat-icon ${summary && summary.expiring_my_certifications_90d > 0 ? 'alert' : ''}`} aria-hidden="true"><BadgeAlert /></span>
              <span className="ah-stat-value">{summary?.expiring_my_certifications_90d ?? 0}</span>
              <span className="ah-stat-label">Certificaciones por vencer</span>
              <span className="ah-stat-sub">Próximos 90 días</span>
              {summary && summary.expiring_my_certifications_90d > 0 ? (
                <span className="ah-stat-warn">Revisa tus certificaciones</span>
              ) : (
                <span className="ah-stat-link">Ver certificaciones <ArrowRight width={13} height={13} /></span>
              )}
            </Link>
          </div>

          <section className="ah-section">
            <div className="ah-section-head">
              <div>
                <h3 className="ah-section-title">Oportunidades para ti</h3>
                <p className="ah-section-sub">Seleccionadas según tu perfil, competencias y disponibilidad.</p>
              </div>
              <Link to="/auditor/opportunities" className="ah-section-more">Ver todas <ArrowRight width={13} height={13} /></Link>
            </div>

            {topOpps.length === 0 ? (
              <div className="ah-opps-empty">No hay oportunidades compatibles actualmente.</div>
            ) : (
              <div className="ah-opps">
                {topOpps.map((o) => (
                  <OppCard key={o.id} o={o} saved={saved.has(o.id)} onSave={() => saved.toggle(o.id)} />
                ))}
              </div>
            )}
          </section>

          <div className="ah-bottom">
            <section className="ah-panel">
              <div className="ah-panel-head">
                <h3 className="ah-section-title">Actividad reciente</h3>
              </div>
              {activity.length === 0 ? (
                <div className="ah-empty">Tu actividad aparecerá aquí.</div>
              ) : (
                <ul className="ah-activity">
                  {activity.map((e) => (
                    <li key={e.id} className="ah-activity-item">
                      <span className={`ah-activity-icon ${e.kind}`} aria-hidden="true">{e.kind === 'assignment' ? <Check width={15} height={15} /> : <Send width={15} height={15} />}</span>
                      <div className="ah-activity-body">
                        <div className="ah-activity-title">{e.title}</div>
                        <div className="ah-activity-sub">{e.subtitle}</div>
                      </div>
                      <span className="ah-activity-time">{e.time}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/auditor/applications" className="ah-section-more">Ver toda la actividad <ArrowRight width={13} height={13} /></Link>
            </section>

            <ProfilePanel pct={profilePct} checks={profileChecks} />
          </div>
        </>
      )}
    </div>
  )
}

function OppCard({ o, saved, onSave }: { o: AuditorOpportunity; saved: boolean; onSave: () => void }) {
  const st = statusOf(o)
  return (
    <article className="ah-opp">
      <div className="ah-opp-head">
        <span className="ah-opp-folio">{o.folio}</span>
        <span className={`ah-opp-status ${st.tone}`}><i className="ah-dot" />{st.label}</span>
        <button type="button" className={`ah-opp-save ${saved ? 'saved' : ''}`} aria-label={saved ? 'Quitar de guardadas' : 'Guardar'} onClick={onSave}>
          <Bookmark width={18} height={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <h4 className="ah-opp-title">{o.title}</h4>
      <div className="ah-opp-meta">
        <span><MapPin width={13} height={13} /> {[o.city, o.state].filter(Boolean).join(', ') || '—'}</span>
        <span><CalendarDays width={13} height={13} /> {formatDate(o.start_date)} → {formatDate(o.end_date)}</span>
        <span><Clock3 width={13} height={13} /> {o.number_of_days} días</span>
      </div>
      <div className="ah-opp-norms">
        {o.competencies.map((c) => <span key={c.id} className="mk-norm">{c.competency.name}</span>)}
      </div>
      <div className="ah-opp-foot">
        <div className="ah-opp-offer">
          <span className="mk-offer-label">Oferta económica</span>
          <span className="mk-offer">{formatMoney(o.payment_amount)}</span>
        </div>
        <Link to={`/auditor/opportunities/${o.id}`} className="btn btn-sm btn-ghost">Ver oportunidad</Link>
      </div>
    </article>
  )
}

function ProfilePanel({ pct, checks }: { pct: number; checks: ProfileCheck[] }) {
  return (
    <section className="ah-panel ah-profile">
      <div className="ah-panel-head">
        <h3 className="ah-section-title">Tu perfil profesional</h3>
      </div>
      <div className="ah-profile-body">
        <div className="ah-ring" style={{ ['--ah-pct' as string]: `${pct}` }}>
          <span className="ah-ring-value">{pct}<em>%</em></span>
          <span className="ah-ring-label">completo</span>
        </div>
        <ul className="ah-profile-checks">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? 'ok' : 'warn'}>
              <span className="ah-check-icon" aria-hidden="true">{c.ok ? <Check width={14} height={14} /> : <AlertTriangle width={14} height={14} />}</span>
              {c.label}
            </li>
          ))}
        </ul>
      </div>
      <Link to="/auditor/profile" className="btn btn-ghost">Completar perfil</Link>
    </section>
  )
}

function AuditorHomeSkeleton() {
  return (
    <div className="ah">
      <div className="ah-summary">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="oi-skeleton ah-skel-stat" style={{ height: 170 }} />)}
      </div>
      <div className="oi-skeleton ah-skel-head" style={{ height: 22, width: 260 }} />
      <div className="ah-opps">
        {Array.from({ length: 2 }).map((_, i) => <div key={i} className="oi-skeleton" style={{ height: 220 }} />)}
      </div>
      <div className="ah-bottom">
        <div className="oi-skeleton" style={{ height: 240 }} />
        <div className="oi-skeleton" style={{ height: 240 }} />
      </div>
    </div>
  )
}
