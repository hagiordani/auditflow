import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuditorPerformance as Perf } from '../../api/reports'
import type { Auditor } from '../../api/types'
import { EmptyState } from './EmptyState'

type SortKey = 'name' | 'assigned' | 'in_execution' | 'finalized' | 'completion_pct'

function auditorInfo(auditors: Auditor[]): Map<number, { type: string; specialty: string | null; roles: string[] }> {
  const map = new Map<number, { type: string; specialty: string | null; roles: string[] }>()
  for (const a of auditors)
    map.set(a.id, {
      type: a.auditor_type,
      specialty: a.specialty,
      roles: (a.roles ?? '').split(/[;,]/).map((s) => s.trim()).filter(Boolean),
    })
  return map
}

export function AuditorPerformance({
  auditors,
  perf,
}: {
  auditors: Auditor[]
  perf: Perf[]
}) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('finalized')
  const info = useMemo(() => auditorInfo(auditors), [auditors])

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const filtered = term
      ? perf.filter(
          (a) => a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term),
        )
      : [...perf]
    return filtered.sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      return (b[sortKey] as number) - (a[sortKey] as number)
    })
  }, [perf, q, sortKey])

  return (
    <section className="oi-panel oi-panel-wide" aria-label="Rendimiento de auditores">
      <div className="oi-panel-head">
        <h3 className="oi-panel-title">Rendimiento de auditores</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/auditors')}>
          Ver todos
        </button>
      </div>

      <div className="oi-table-toolbar">
        <input
          type="search"
          className="oi-search"
          placeholder="Buscar auditor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar auditor"
        />
        <select
          className="oi-sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          aria-label="Ordenar por"
        >
          <option value="finalized">Finalizadas</option>
          <option value="in_execution">En ejecución</option>
          <option value="assigned">Asignadas</option>
          <option value="completion_pct">Cumplimiento</option>
          <option value="name">Nombre</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="♙"
          title="Sin auditores todavía."
          description="Da de alta auditores y asígnales servicios para ver su rendimiento."
          action={{ label: 'Ver auditores', onClick: () => navigate('/auditors') }}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Auditor</th>
                <th>Tipo</th>
                <th>Cargo / roles</th>
                <th>Asignadas</th>
                <th>En ejecución</th>
                <th>Finalizadas</th>
                <th>Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 8).map((a) => {
                return (
                  <tr key={a.auditor_id}>
                    <td>
                      <button
                        type="button"
                        className="oi-link"
                        onClick={() => navigate(`/auditors/${a.auditor_id}`)}
                      >
                        {a.name}
                      </button>
                      <div className="muted small">{a.email}</div>
                    </td>
                    <td>
                      <span
                        className={`badge ${info.get(a.auditor_id)?.type === 'interno' ? 'badge-busy' : 'badge-primary'}`}
                      >
                        {info.get(a.auditor_id)?.type === 'interno' ? 'Interno' : 'Externo'}
                      </span>
                    </td>
                    <td>
                      {(() => {
                        const meta = info.get(a.auditor_id)
                        const hasData = meta?.specialty || (meta?.roles.length ?? 0) > 0
                        if (!hasData) return <span className="muted small">—</span>
                        return (
                          <div className="oi-cred-badges">
                            {meta?.specialty && <span className="oi-cred-badge">{meta.specialty}</span>}
                            {meta?.roles.map((r) => (
                              <span key={r} className="oi-cred-badge">
                                {r}
                              </span>
                            ))}
                          </div>
                        )
                      })()}
                    </td>
                    <td>{a.assigned}</td>
                    <td>{a.in_execution}</td>
                    <td>{a.finalized}</td>
                    <td>
                      <span
                        className={`badge ${
                          a.completion_pct >= 90
                            ? 'badge-valid'
                            : a.completion_pct >= 70
                              ? 'badge-busy'
                              : 'badge-invalid'
                        }`}
                      >
                        {a.completion_pct}%
                      </span>
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
