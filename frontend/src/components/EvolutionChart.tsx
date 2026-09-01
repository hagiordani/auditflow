import type { EvolutionPoint } from '../api/reports'

const SERIES = [
  { key: 'created' as const, label: 'Creadas', color: '#145da0' },
  { key: 'assigned' as const, label: 'Asignadas', color: '#e99b2f' },
  { key: 'finalized' as const, label: 'Finalizadas', color: '#20a05a' },
]

export function EvolutionChart({ data }: { data: EvolutionPoint[] }) {
  const width = 640
  const height = 220
  const pad = { top: 16, right: 16, bottom: 28, left: 30 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.assigned, d.finalized]))

  const x = (i: number) => pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW)
  const y = (v: number) => pad.top + innerH - (v / max) * innerH

  const points = (key: 'created' | 'assigned' | 'finalized') =>
    data.map((d, i) => `${x(i)},${y(d[key])}`).join(' ')

  const labelIndexes = data.length > 3 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : data.map((_, i) => i)

  return (
    <div className="evolution-chart">
      <div className="chart-legend">
        {SERIES.map((s) => (
          <span key={s.key} className="chart-legend-item">
            <span className="chart-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución de auditorías">
        {/* gridlines */}
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={pad.left}
            x2={width - pad.right}
            y1={y(max * f)}
            y2={y(max * f)}
            stroke="#eef2f7"
            strokeWidth={1}
          />
        ))}
        {SERIES.map((s) => (
          <polyline
            key={s.key}
            points={points(s.key)}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {labelIndexes.map((i) => (
          <text key={i} x={x(i)} y={height - 8} textAnchor="middle" className="chart-axis-label">
            {data[i]?.label}
          </text>
        ))}
      </svg>
    </div>
  )
}
