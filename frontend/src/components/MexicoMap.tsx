import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ByStateMetric } from '../api/reports'
import { MEXICO_REGIONS, resolveState } from '../utils/mexico'

type MetricKey = 'opportunities' | 'in_execution' | 'finalized' | 'auditors' | 'clients'

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'opportunities', label: 'Oportunidades' },
  { key: 'in_execution', label: 'En ejecución' },
  { key: 'finalized', label: 'Finalizadas' },
  { key: 'auditors', label: 'Auditores' },
  { key: 'clients', label: 'Clientes' },
]

function shade(value: number, max: number): { bg: string; fg: string } {
  if (value <= 0) return { bg: '#eef2f7', fg: '#70809a' }
  const t = Math.min(1, value / Math.max(1, max))
  const from = [219, 234, 254]
  const to = [20, 93, 160]
  const r = Math.round(from[0] + (to[0] - from[0]) * t)
  const g = Math.round(from[1] + (to[1] - from[1]) * t)
  const b = Math.round(from[2] + (to[2] - from[2]) * t)
  return { bg: `rgb(${r},${g},${b})`, fg: t > 0.55 ? '#fff' : '#14233d' }
}

export function MexicoMap({ data }: { data: ByStateMetric[] }) {
  const navigate = useNavigate()
  const [metric, setMetric] = useState<MetricKey>('opportunities')

  const values = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of data) {
      const state = resolveState(row.state)
      if (state) map.set(state.name, row[metric])
    }
    return map
  }, [data, metric])

  const max = useMemo(() => Math.max(0, ...values.values()), [values])

  return (
    <div>
      <div className="map-toolbar">
        <label className="muted small">Mostrar:</label>
        <select value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)}>
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mexico-map">
        {MEXICO_REGIONS.map((region) => (
          <div key={region.name} className="mexico-region">
            <div className="mexico-region-name">{region.name}</div>
            <div className="mexico-tiles">
              {region.states.map((state) => {
                const value = values.get(state.name) ?? 0
                const color = shade(value, max)
                return (
                  <button
                    key={state.name}
                    type="button"
                    className="mexico-tile"
                    style={{ background: color.bg, color: color.fg }}
                    title={`${state.name}\n${METRICS.find((m) => m.key === metric)?.label}: ${value}`}
                    onClick={() => navigate(`/opportunities?state=${encodeURIComponent(state.name)}`)}
                  >
                    <span className="mexico-tile-abbr">{state.abbr}</span>
                    <span className="mexico-tile-value">{value}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
