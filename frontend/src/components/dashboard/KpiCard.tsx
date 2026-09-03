type Tone = 'default' | 'primary' | 'success' | 'warning' | 'danger'
type TrendDirection = 'up' | 'down' | 'flat'

export interface KpiCardProps {
  label: string
  value: string | number
  icon?: string
  hint?: string
  trend?: { direction: TrendDirection; label: string } | null
  tone?: Tone
  onClick?: () => void
}

/** KPI operacional: valor principal + etiqueta + variación/contexto + estado. */
export function KpiCard({
  label,
  value,
  icon,
  hint,
  trend,
  tone = 'default',
  onClick,
}: KpiCardProps) {
  return (
    <div
      className={`oi-kpi ${tone !== 'default' ? `oi-kpi-${tone}` : ''} ${onClick ? 'oi-kpi-clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="oi-kpi-top">
        <div className="oi-kpi-label">{label}</div>
        {icon && <span className="oi-kpi-icon" aria-hidden="true">{icon}</span>}
      </div>
      <div className="oi-kpi-value">{value}</div>
      {trend && (
        <div className={`oi-kpi-trend oi-trend-${trend.direction}`}>
          <span className="oi-kpi-trend-arrow">
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}
          </span>
          <span>{trend.label}</span>
        </div>
      )}
      {!trend && hint && <div className="oi-kpi-hint">{hint}</div>}
    </div>
  )
}
