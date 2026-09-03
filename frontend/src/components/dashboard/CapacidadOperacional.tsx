import type { Auditor } from '../../api/types'
import { EmptyState } from './EmptyState'

function CapacityStat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'success' | 'warning' | 'danger'
}) {
  return (
    <div className="oi-cap-stat">
      <span className={`oi-cap-value ${tone ? `oi-cap-${tone}` : ''}`}>{value}</span>
      <span className="oi-cap-label">{label}</span>
    </div>
  )
}

/** Capacidad operacional: total, disponibles, ocupados y demanda vs capacidad. */
export function CapacidadOperacional({
  auditors,
  demand,
}: {
  auditors: Auditor[]
  demand: number
}) {
  const active = auditors.filter((a) => a.is_active).length
  const available = auditors.filter((a) => a.availability_status === 'available').length
  const busy = auditors.filter((a) => a.availability_status === 'busy').length
  const unavailable = auditors.filter((a) => a.availability_status === 'unavailable').length
  const ratio = active > 0 ? Math.min(1, demand / active) : 0
  const pct = Math.round(ratio * 100)

  return (
    <section className="oi-panel oi-cap" aria-label="Capacidad operacional">
      <div className="oi-panel-head">
        <h3 className="oi-panel-title">Capacidad operacional</h3>
      </div>
      {auditors.length === 0 ? (
        <EmptyState
          icon="♙"
          title="Sin auditores registrados."
          description="Da de alta auditores para conocer la capacidad disponible."
        />
      ) : (
        <>
          <div className="oi-cap-grid">
            <CapacityStat label="Total auditores" value={auditors.length} />
            <CapacityStat label="Activos" value={active} />
            <CapacityStat label="Disponibles" value={available} tone="success" />
            <CapacityStat label="Ocupados" value={busy} tone="warning" />
            <CapacityStat label="No disponibles" value={unavailable} tone="danger" />
          </div>
          <div className="oi-cap-ratio">
            <span className="oi-cap-ratio-label">
              Demanda actual ({demand} en ejecución) vs capacidad ({active} activos)
            </span>
            <div className="oi-cap-bar">
              <div className="oi-cap-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="oi-cap-ratio-value">{pct}%</span>
          </div>
          <p className="oi-cap-note">
            El modelo actual no distingue auditores internos/externos; se muestran únicamente los
            datos de disponibilidad registrados.
          </p>
        </>
      )}
    </section>
  )
}
