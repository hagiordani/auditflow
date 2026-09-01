interface DonutSegment {
  label: string
  value: number
  color: string
}

/** Gráfica de dona en SVG puro (sin dependencias). */
export function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const total = segments.reduce((acc, s) => acc + s.value, 0)
  const size = 180
  const stroke = 26
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const cx = size / 2

  let offset = 0

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke="#eef2f7"
          strokeWidth={stroke}
        />
        {total > 0 &&
          segments.map((s, i) => {
            const frac = s.value / total
            const dash = frac * c
            const el = (
              <circle
                key={i}
                cx={cx}
                cy={cx}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${cx} ${cx})`}
              />
            )
            offset += dash
            return el
          })}
        <text x={cx} y={cx - 4} textAnchor="middle" className="donut-total">
          {total}
        </text>
        <text x={cx} y={cx + 16} textAnchor="middle" className="donut-caption">
          oportunidades
        </text>
      </svg>
      <div className="donut-legend">
        {segments.map((s) => (
          <div key={s.label} className="donut-legend-row">
            <span className="donut-swatch" style={{ background: s.color }} />
            <span className="donut-legend-label">{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
