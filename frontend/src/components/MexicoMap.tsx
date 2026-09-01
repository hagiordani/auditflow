import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { geoMercator, geoPath } from 'd3-geo'
import type { ByStateMetric } from '../api/reports'
import { resolveState } from '../utils/mexico'
import mexicoData from '../assets/mexico.json'

type MetricKey = 'opportunities' | 'in_execution' | 'finalized' | 'auditors' | 'clients'

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'opportunities', label: 'Oportunidades' },
  { key: 'in_execution', label: 'En ejecución' },
  { key: 'finalized', label: 'Finalizadas' },
  { key: 'auditors', label: 'Auditores' },
  { key: 'clients', label: 'Clientes' },
]

const collection = mexicoData as unknown as {
  features: { properties: { name: string }; geometry: unknown }[]
}

function shade(value: number, max: number): string {
  if (value <= 0) return '#eef2f7'
  const t = Math.min(1, value / Math.max(1, max))
  const from = [219, 234, 254]
  const to = [20, 93, 160]
  const r = Math.round(from[0] + (to[0] - from[0]) * t)
  const g = Math.round(from[1] + (to[1] - from[1]) * t)
  const b = Math.round(from[2] + (to[2] - from[2]) * t)
  return `rgb(${r},${g},${b})`
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

  const projection = useMemo(
    () => geoMercator().fitSize([720, 540], mexicoData as never),
    [],
  )
  const pathGen = useMemo(() => geoPath(projection), [projection])

  const metricLabel = METRICS.find((m) => m.key === metric)?.label ?? ''

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

      <svg viewBox="0 0 720 540" className="mexico-svg" role="img" aria-label="Mapa de México">
        {collection.features.map((f) => {
          const state = resolveState(f.properties.name)
          const value = state ? (values.get(state.name) ?? 0) : 0
          const d = pathGen(f.geometry as never)
          if (!d) return null
          return (
            <path
              key={f.properties.name}
              d={d}
              fill={shade(value, max)}
              stroke="#ffffff"
              strokeWidth={0.8}
              className="mexico-state"
              onClick={() =>
                state && navigate(`/opportunities?state=${encodeURIComponent(state.name)}`)
              }
            >
              <title>{`${state?.name ?? f.properties.name}\n${metricLabel}: ${value}`}</title>
            </path>
          )
        })}
      </svg>

      <div className="map-legend">
        <span>0</span>
        <div
          className="map-legend-bar"
          style={{ background: 'linear-gradient(90deg, #dbeafe, #145da0)' }}
        />
        <span>{max}</span>
      </div>
    </div>
  )
}
