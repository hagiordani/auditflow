export type Period = 7 | 30 | 90 | 365

const OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
  { value: 365, label: '12 meses' },
]

/** Control de periodo (7d / 30d / 90d / 12 meses). */
export function PeriodSelector({
  value,
  onChange,
}: {
  value: Period
  onChange: (p: Period) => void
}) {
  return (
    <div className="oi-period" role="tablist" aria-label="Seleccionar periodo">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={`oi-period-btn ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
