import type { AuditOpportunity } from '../../api/types'
import { buildStateStatus } from '../../utils/dashboard'
import { EmptyState } from './EmptyState'

/** Distribución de servicios por estado y por estatus (complemento del mapa). */
export function StateStatusChart({ opportunities }: { opportunities: AuditOpportunity[] }) {
  const rows = buildStateStatus(opportunities)
  const max = Math.max(1, ...rows.map((r) => r.total))
  const presentLabels =
    rows.length > 0
      ? rows[0].buckets
          .map((b) => b.label)
          .filter((label) => rows.some((r) => r.buckets.find((x) => x.label === label)!.value > 0))
      : []

  return (
    <section className="oi-panel oi-state-status" aria-label="Distribución por estado y estatus">
      <div className="oi-panel-head">
        <h3 className="oi-panel-title">Distribución por estado y estatus</h3>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon="◌"
          title="Sin distribución por estado."
          description="Cuando existan servicios con estado y estatus verás su desglose aquí."
        />
      ) : (
        <div className="oi-ss">
          <div className="oi-ss-legend">
            {presentLabels.map((label) => {
              const bucket = rows[0].buckets.find((b) => b.label === label)!
              return (
                <span key={label} className="oi-ss-legend-item">
                  <span className="oi-ss-swatch" style={{ background: bucket.color }} />
                  {label}
                </span>
              )
            })}
          </div>
          <div className="oi-ss-list">
            {rows.map((r) => (
              <div className="oi-ss-row" key={r.state}>
                <div className="oi-ss-head">
                  <span className="oi-ss-state">{r.state}</span>
                  <span className="oi-ss-total">{r.total}</span>
                </div>
                <div className="oi-ss-bar">
                  {r.buckets.map((b) =>
                    b.value > 0 ? (
                      <span
                        key={b.label}
                        className="oi-ss-seg"
                        style={{ width: `${(b.value / max) * 100}%`, background: b.color }}
                        title={`${b.label}: ${b.value}`}
                      />
                    ) : null,
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
