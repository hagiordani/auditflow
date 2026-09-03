interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
}

export function Skeleton({ width, height = 14, className = '' }: SkeletonProps) {
  return (
    <span
      className={`oi-skeleton ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  )
}

export function KpiSkeleton() {
  return (
    <div className="oi-kpi oi-kpi-skeleton">
      <Skeleton width="55%" height={12} />
      <Skeleton width="40%" height={28} />
      <Skeleton width="70%" height={11} />
    </div>
  )
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="oi-panel-skeleton" aria-hidden="true">
      <Skeleton width="35%" height={16} className="oi-skeleton-title" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="oi-skeleton-row">
          <Skeleton width="38%" height={12} />
          <Skeleton width="24%" height={12} />
        </div>
      ))}
    </div>
  )
}
