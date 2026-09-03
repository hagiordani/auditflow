import { useNavigate } from 'react-router-dom'
import type { ReportsSummary } from '../../api/reports'
import type { AuditOpportunity } from '../../api/types'
import { buildAlerts } from '../../utils/dashboard'
import { EmptyState } from './EmptyState'

/** Centro de atención: alertas operacionales que requieren intervención. */
export function AttentionCenter({
  summary,
  opportunities,
}: {
  summary: ReportsSummary
  opportunities: AuditOpportunity[]
}) {
  const navigate = useNavigate()
  const alerts = buildAlerts(summary, opportunities)

  return (
    <section className="oi-panel oi-attention" aria-label="Atención requerida">
      <div className="oi-panel-head">
        <h3 className="oi-panel-title">Atención requerida</h3>
        {alerts.length > 0 && <span className="oi-count oi-count-danger">{alerts.length}</span>}
      </div>
      {alerts.length === 0 ? (
        <EmptyState
          icon="✓"
          title="Operación sin alertas"
          description="No hay situaciones que requieran intervención."
        />
      ) : (
        <ul className="oi-alert-list">
          {alerts.map((a) => (
            <li
              key={a.message}
              className={`oi-alert oi-alert-${a.severity}`}
              onClick={a.to ? () => navigate(a.to!) : undefined}
              role={a.to ? 'button' : undefined}
              tabIndex={a.to ? 0 : undefined}
              onKeyDown={a.to ? (e) => e.key === 'Enter' && navigate(a.to!) : undefined}
            >
              <span className="oi-alert-dot" aria-hidden="true" />
              <div className="oi-alert-body">
                <div className="oi-alert-title">{a.message}</div>
                <div className="oi-alert-detail">{a.detail}</div>
              </div>
              {a.to && <span className="oi-alert-cta">Ver</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
