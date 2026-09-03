import type { ReportsSummary } from '../../api/reports'
import { buildStages } from '../../utils/dashboard'

/** Flujo operacional: Oportunidades → Asignación → Ejecución → Finalización. */
export function OperationalSnapshot({ summary }: { summary: ReportsSummary }) {
  const stages = buildStages(summary)
  const max = Math.max(1, ...stages.map((s) => s.value))

  return (
    <section className="oi-panel oi-snapshot" aria-label="Flujo operacional">
      <div className="oi-panel-head">
        <h3 className="oi-panel-title">Flujo operacional</h3>
      </div>
      <div className="oi-funnel">
        {stages.map((s) => (
          <div className="oi-funnel-stage" key={s.label}>
            <div className="oi-funnel-track">
              <span
                className="oi-funnel-bar"
                style={{ width: `${Math.max(6, (s.value / max) * 100)}%` }}
              >
                {s.value}
              </span>
            </div>
            <span className="oi-funnel-label">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
