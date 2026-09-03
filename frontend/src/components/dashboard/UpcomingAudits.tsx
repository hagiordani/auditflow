import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuditOpportunity, Auditor, StaffCalendarEvent } from '../../api/types'
import { buildUpcoming } from '../../utils/dashboard'
import { EmptyState } from './EmptyState'

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function credsByName(auditors: Auditor[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const a of auditors) {
    map.set(
      a.full_name,
      a.competencies.filter((c) => c.is_valid).map((c) => `${c.competency.name} (${c.level})`),
    )
  }
  return map
}

/** Próximas auditorías en timeline. */
export function UpcomingAudits({
  calendar,
  opportunities,
  auditors,
}: {
  calendar: StaffCalendarEvent[]
  opportunities: AuditOpportunity[]
  auditors: Auditor[]
}) {
  const navigate = useNavigate()
  const upcoming = buildUpcoming(calendar, opportunities)
  const creds = useMemo(() => credsByName(auditors), [auditors])

  return (
    <section className="oi-panel oi-upcoming" aria-label="Próximas auditorías">
      <div className="oi-panel-head">
        <h3 className="oi-panel-title">Próximas auditorías</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/calendar')}>
          Ver calendario
        </button>
      </div>
      {upcoming.length === 0 ? (
        <EmptyState
          icon="◷"
          title="No hay auditorías en los próximos 30 días."
          description="Las asignaciones confirmadas de los próximos meses aparecerán aquí."
        />
      ) : (
        <ol className="oi-timeline">
          {upcoming.map((u) => {
            const roles = creds.get(u.auditorName) ?? []
            return (
              <li className="oi-timeline-item" key={u.folio}>
                <div className="oi-timeline-date">{shortDate(u.startDate)}</div>
                <div className="oi-timeline-body">
                  <div className="oi-timeline-title">{u.title}</div>
                  <div className="oi-timeline-sub">
                    {u.clientName ?? 'Cliente por asignar'} ·{' '}
                    {[u.city, u.state].filter(Boolean).join(', ') || 'Sin ubicación'}
                  </div>
                  <div className="oi-timeline-auditor">
                    Auditor: {u.auditorName}
                    {roles.length > 0 && (
                      <span className="oi-cred-badges oi-timeline-badges">
                        {roles.map((r) => (
                          <span key={r} className="oi-cred-badge">
                            {r}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`oi-chip ${u.status === 'confirmed' ? 'oi-chip-tone' : 'oi-chip-warn'}`}
                >
                  {u.status === 'confirmed' ? 'Confirmado' : 'Por confirmar'}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
