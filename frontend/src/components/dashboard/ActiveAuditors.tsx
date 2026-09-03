import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuditOpportunity, Auditor, StaffCalendarEvent } from '../../api/types'
import { buildActiveAudits } from '../../utils/dashboard'
import { formatDate } from '../../utils/status'
import { EmptyState } from './EmptyState'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || 'AF'
}

function auditorMap(auditors: Auditor[]): Map<string, { type: string; specialty: string | null; roles: string[] }> {
  const map = new Map<string, { type: string; specialty: string | null; roles: string[] }>()
  for (const a of auditors)
    map.set(a.full_name, {
      type: a.auditor_type,
      specialty: a.specialty,
      roles: (a.roles ?? '').split(/[;,]/).map((s) => s.trim()).filter(Boolean),
    })
  return map
}

const TYPE_LABELS: Record<string, string> = { interno: 'Interno', externo: 'Externo' }

/** Auditores en operación: quién audita qué puesto, para qué cliente, dónde y cuándo. */
export function ActiveAuditors({
  calendar,
  opportunities,
  auditors,
}: {
  calendar: StaffCalendarEvent[]
  opportunities: AuditOpportunity[]
  auditors: Auditor[]
}) {
  const navigate = useNavigate()
  const audits = buildActiveAudits(calendar, opportunities)
  const info = useMemo(() => auditorMap(auditors), [auditors])

  return (
    <section className="oi-panel oi-panel-wide oi-active" aria-label="Auditores en operación">
      <div className="oi-panel-head">
        <h3 className="oi-panel-title">Auditores en operación</h3>
        {audits.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/auditors')}>
            Ver todos →
          </button>
        )}
      </div>
      {audits.length === 0 ? (
        <EmptyState
          icon="◌"
          title="Actualmente no hay auditorías en ejecución."
          description="Cuando un servicio esté en ejecución verás aquí a cada auditor y su avance."
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Auditor</th>
                <th>Tipo</th>
                <th>Cargo / Especialidad</th>
                <th>Puesto auditado</th>
                <th>Cliente</th>
                <th>Ubicación</th>
                <th>Periodo</th>
                <th>Estado</th>
                <th>Progreso</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((a) => {
                const meta = info.get(a.auditorName)
                const pct =
                  a.dayIndex && a.totalDays > 0 ? Math.round((a.dayIndex / a.totalDays) * 100) : 0
                return (
                  <tr key={a.assignmentId}>
                    <td>
                      <div className="oi-user-cell">
                        <span className="oi-avatar" aria-hidden="true">
                          {initials(a.auditorName)}
                        </span>
                        <span className="oi-user-name">{a.auditorName}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${meta?.type === 'interno' ? 'badge-busy' : 'badge-primary'}`}
                      >
                        {meta ? TYPE_LABELS[meta.type] ?? '—' : '—'}
                      </span>
                    </td>
                    <td>
                      {meta?.specialty ? <div className="oi-cred">{meta.specialty}</div> : null}
                      {meta && meta.roles.length > 0 && (
                        <div className="oi-cred-badges">
                          {meta.roles.map((r) => (
                            <span key={r} className="oi-cred-badge">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                      {!meta?.specialty && (!meta || meta.roles.length === 0) && '—'}
                    </td>
                    <td>
                      <strong>{a.title}</strong>
                    </td>
                    <td>{a.clientName ?? '—'}</td>
                    <td>{[a.city, a.state].filter(Boolean).join(', ') || '—'}</td>
                    <td>
                      {formatDate(a.startDate)} — {formatDate(a.endDate)}
                    </td>
                    <td>
                      <span className="oi-chip oi-chip-active">En ejecución</span>
                    </td>
                    <td>
                      <div className="oi-progress oi-progress-inline">
                        <div className="oi-progress-track">
                          <div className="oi-progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="oi-progress-label">
                          {pct}% · Día {a.dayIndex ?? '—'} de {a.totalDays}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
