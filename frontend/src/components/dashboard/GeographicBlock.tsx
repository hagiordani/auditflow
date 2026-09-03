import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { geoMercator, geoPath } from 'd3-geo'
import type { ByStateMetric } from '../../api/reports'
import type { AuditOpportunity, Auditor, StaffCalendarEvent } from '../../api/types'
import { buildGeoModel, type GeoAuditor } from '../../utils/dashboard'
import { resolveState } from '../../utils/mexico'
import { formatDate } from '../../utils/status'
import mexicoData from '../../assets/mexico.json'
import { EmptyState } from './EmptyState'

type MapMetric = 'opportunities' | 'auditors' | 'clients'

const METRICS: { key: MapMetric; label: string }[] = [
  { key: 'opportunities', label: 'Auditorías' },
  { key: 'auditors', label: 'Auditores' },
  { key: 'clients', label: 'Clientes' },
]

const TYPE_LABELS: Record<string, string> = { interno: 'Interno', externo: 'Externo' }

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

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || 'AF'
}

function statusChipClass(label: string): string {
  if (label === 'En ejecución') return 'oi-chip-active'
  if (label === 'Asignada') return 'oi-chip-warn'
  return 'oi-chip-tone'
}

/** Bloque geográfico: mapa de México + distribución por estado y estatus. */
export function GeographicBlock({
  byState,
  opportunities,
  calendar,
  auditors,
}: {
  byState: ByStateMetric[]
  opportunities: AuditOpportunity[]
  calendar: StaffCalendarEvent[]
  auditors: Auditor[]
}) {
  const navigate = useNavigate()
  const [metric, setMetric] = useState<MapMetric>('opportunities')
  const [mode, setMode] = useState<'map' | 'list'>('map')
  const [selected, setSelected] = useState<string | null>(null)
  const [hover, setHover] = useState<{ name: string; value: number; x: number; y: number } | null>(null)
  const mapRef = useRef<HTMLDivElement>(null)

  const geo = useMemo(
    () => buildGeoModel(opportunities, calendar, auditors),
    [opportunities, calendar, auditors],
  )

  const values = useMemo(() => {
    const m = new Map<string, number>()
    for (const row of byState) {
      const st = resolveState(row.state)
      if (st) m.set(st.name, row[metric])
    }
    return m
  }, [byState, metric])
  const max = Math.max(0, ...values.values())

  const projection = useMemo(() => geoMercator().fitSize([720, 540], mexicoData as never), [])
  const pathGen = useMemo(() => geoPath(projection), [projection])

  const geoByState = useMemo(() => new Map(geo.states.map((s) => [s.state, s])), [geo])

  const bucketTotals = useMemo(() => {
    if (geo.states.length === 0) return []
    const labels = geo.states[0].buckets.map((b) => b.label)
    return labels.map((label) => {
      const value = geo.states.reduce((acc, s) => acc + (s.buckets.find((b) => b.label === label)?.value ?? 0), 0)
      return { label, value }
    })
  }, [geo])
  const bucketSum = bucketTotals.reduce((a, b) => a + b.value, 0)

  const onMove = (name: string, value: number, e: { clientX: number; clientY: number }) => {
    const rect = mapRef.current?.getBoundingClientRect()
    if (!rect) return
    setHover({ name, value, x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const hoveredGeo = hover ? geoByState.get(hover.name) : undefined

  return (
    <div className="oi-geo">
      <div className="oi-grid oi-grid-map">
        {/* Mapa */}
        <section className="oi-panel oi-geo-panel" aria-label="Auditorías en México">
          <div className="oi-geo-head">
            <h3 className="oi-panel-title">Auditorías en México</h3>
            <div className="oi-toggle" role="tablist" aria-label="Vista de mapa">
              <button
                type="button"
                className={`oi-toggle-btn ${mode === 'map' ? 'active' : ''}`}
                aria-selected={mode === 'map'}
                onClick={() => setMode('map')}
              >
                ▦ Mapa
              </button>
              <button
                type="button"
                className={`oi-toggle-btn ${mode === 'list' ? 'active' : ''}`}
                aria-selected={mode === 'list'}
                onClick={() => setMode('list')}
              >
                ☰ Lista
              </button>
            </div>
          </div>
          <div className="oi-map-toolbar">
            <label className="oi-map-metric">
              Mostrar:
              <select value={metric} onChange={(e) => setMetric(e.target.value as MapMetric)}>
                {METRICS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {geo.states.length === 0 ? (
            <EmptyState
              icon="◌"
              title="Sin actividad geográfica todavía."
              description="Cuando existan servicios con estado verás aquí la distribución."
            />
          ) : mode === 'list' ? (
            <div className="oi-list-view">
              {geo.states.map((s) => (
                <button
                  type="button"
                  className={`oi-list-row ${selected === s.state ? 'active' : ''}`}
                  key={s.state}
                  onClick={() => setSelected((cur) => (cur === s.state ? null : s.state))}
                >
                  <span className="oi-list-name">{s.state}</span>
                  <span className="oi-list-total">{s.total}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="oi-map-wrap" ref={mapRef}>
              <svg viewBox="0 0 720 540" className="oi-map-svg" role="img" aria-label="Mapa de México">
                {collection.features.map((f) => {
                  const st = resolveState(f.properties.name)
                  const name = st?.name ?? f.properties.name
                  const value = values.get(name) ?? 0
                  const d = pathGen(f.geometry as never)
                  if (!d) return null
                  const isSelected = name === selected
                  return (
                    <path
                      key={f.properties.name}
                      d={d}
                      fill={shade(value, max)}
                      stroke={isSelected ? '#0f4f87' : '#ffffff'}
                      strokeWidth={isSelected ? 1.6 : 0.8}
                      className="oi-map-state"
                      onClick={() => setSelected((cur) => (cur === name ? null : name))}
                      onMouseMove={(e) => onMove(name, value, e)}
                      onMouseLeave={() => setHover(null)}
                    />
                  )
                })}
              </svg>
              <div className="oi-map-legend">
                <span>Menos auditorías</span>
                <span className="oi-map-legend-bar" />
                <span>Más auditorías</span>
              </div>

              {hover && hoveredGeo && (
                <div className="oi-map-tooltip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
                  <div className="oi-tip-title">{hover.name}</div>
                  <div className="oi-tip-row">
                    <span>Total auditorías</span>
                    <strong>{hoveredGeo.total}</strong>
                  </div>
                  {hoveredGeo.buckets.map((b) => (
                    <div className="oi-tip-row" key={b.label}>
                      <span className="oi-tip-dot" style={{ background: b.color }} />
                      <span>{b.label}</span>
                      <strong>{b.value}</strong>
                    </div>
                  ))}
                  <div className="oi-tip-actions">
                    <button
                      type="button"
                      className="oi-tip-link"
                      onClick={() => setSelected(hover.name)}
                    >
                      Auditores en el estado {hoveredGeo.auditors.length}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="oi-map-mini">
            {bucketTotals.map((b) => (
              <div className="oi-map-mini-item" key={b.label}>
                <span className="oi-map-mini-dot" style={{ background: geo.states[0]?.buckets.find((x) => x.label === b.label)?.color }} />
                <span className="oi-map-mini-label">{b.label}</span>
                <strong>{b.value}</strong>
                <span className="oi-map-mini-pct">
                  {bucketSum > 0 ? Math.round((b.value / bucketSum) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Distribución por estado y estatus */}
        <section className="oi-panel oi-geo-panel" aria-label="Distribución por estado y estatus">
          <div className="oi-geo-head">
            <h3 className="oi-panel-title">Distribución por estado y estatus</h3>
            <span className="oi-dist-total-header">Total</span>
          </div>
          <div className="oi-dist-legend">
            {geo.states[0]?.buckets.map((b) => (
              <span key={b.label} className="oi-dist-legend-item">
                <span className="oi-dist-swatch" style={{ background: b.color }} />
                {b.label}
              </span>
            ))}
          </div>
          {geo.states.length === 0 ? (
            <EmptyState
              icon="◌"
              title="Sin distribución por estado."
              description="Cuando existan servicios con estado y estatus verás su desglose aquí."
            />
          ) : (
            <div className="oi-dist-list">
              {geo.states.map((s) => {
                const isOpen = selected === s.state
                return (
                  <div className={`oi-dist-row ${isOpen ? 'open' : ''}`} key={s.state}>
                    <button
                      type="button"
                      className="oi-dist-head"
                      onClick={() => setSelected((cur) => (cur === s.state ? null : s.state))}
                      aria-expanded={isOpen}
                    >
                      <span className="oi-dist-name">
                        {s.state}
                        {isOpen && (
                          <span className="oi-dist-count">Auditores en el estado ({s.auditors.length})</span>
                        )}
                      </span>
                      <span className="oi-dist-bar">
                        {s.buckets.map((b) =>
                          b.value > 0 ? (
                            <span
                              key={b.label}
                              className="oi-dist-seg"
                              style={{ width: `${(b.value / Math.max(1, s.total)) * 100}%`, background: b.color }}
                              title={`${b.label}: ${b.value}`}
                            />
                          ) : null,
                        )}
                      </span>
                      <span className="oi-dist-total">{s.total}</span>
                      <span className="oi-dist-chevron" aria-hidden="true">
                        {isOpen ? '▾' : '▸'}
                      </span>
                    </button>

                    {isOpen && s.auditors.length > 0 && (
                      <ul className="oi-dist-auditors">
                        {s.auditors.map((a) => (
                          <AuditorStateItem key={`${a.name}-${a.puesto}`} a={a} onClick={() => navigate('/auditors')} />
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <button
            type="button"
            className="oi-dist-seeall"
            onClick={() => setMode('list')}
          >
            Ver todos los estados →
          </button>
        </section>
      </div>

      <GeoSummary summary={geo.summary} />

      {selected && selected !== '__list' && (
        <div className="oi-geo-cal">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(`/calendar?state=${encodeURIComponent(selected)}`)}
          >
            Ver {selected} en el calendario →
          </button>
        </div>
      )}
    </div>
  )
}

function AuditorStateItem({ a, onClick }: { a: GeoAuditor; onClick: () => void }) {
  return (
    <li className="oi-dist-auditor">
      <span className="oi-avatar" aria-hidden="true">
        {initials(a.name)}
      </span>
      <span className="oi-dist-auditor-info">
        <span className="oi-dist-auditor-name">{a.name}</span>
        <span className="oi-dist-auditor-meta">
          {TYPE_LABELS[a.type] ?? '—'}
          {a.roles.length > 0 && (
            <span className="oi-cred-badges oi-dist-roles">
              {a.roles.map((r) => (
                <span key={r} className="oi-cred-badge">
                  {r}
                </span>
              ))}
            </span>
          )}
        </span>
      </span>
      <span className="oi-dist-auditor-job">
        <span className="oi-dist-auditor-puesto">{a.puesto}</span>
        <span className="oi-dist-auditor-client">{a.client ?? '—'}</span>
      </span>
      <span className="oi-dist-auditor-dates">{formatDate(a.startDate)}</span>
      <span className={`oi-chip ${statusChipClass(a.statusLabel)}`}>{a.statusLabel}</span>
      <button type="button" className="oi-link oi-dist-auditor-view" onClick={onClick}>
        Ver →
      </button>
    </li>
  )
}

function GeoSummary({ summary }: { summary: ReturnType<typeof buildGeoModel>['summary'] }) {
  const items = [
    { label: 'Total auditorías', value: summary.totalAuditorias },
    { label: 'Estados con actividad', value: summary.estadosConActividad },
    { label: 'Auditores en movimiento', value: summary.auditoresEnMovimiento },
    { label: 'Cobertura geográfica', value: `${summary.coberturaGeografica}%` },
  ]
  return (
    <section className="oi-geo-summary" aria-label="Resumen geográfico">
      <div className="oi-geo-summary-title">Resumen geográfico</div>
      <div className="oi-geo-summary-grid">
        {items.map((it) => (
          <div className="oi-geo-summary-item" key={it.label}>
            <span className="oi-geo-summary-value">{it.value}</span>
            <span className="oi-geo-summary-label">{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
