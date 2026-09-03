import { useMemo, useRef, useState } from 'react'
import type { EvolutionPoint } from '../../api/reports'
import type { ReportsSummary } from '../../api/reports'
import { EmptyState } from './EmptyState'

type Mode = 'activity' | 'accumulated'
type SeriesKey = 'created' | 'assigned' | 'enEjecucion' | 'finalized'

const SERIES: { key: SeriesKey; label: string; color: string }[] = [
  { key: 'created', label: 'Creadas', color: '#145da0' },
  { key: 'assigned', label: 'Asignadas', color: '#7c5bd6' },
  { key: 'enEjecucion', label: 'En ejecución', color: '#f59e0b' },
  { key: 'finalized', label: 'Finalizadas', color: '#20a05a' },
]

const PERIOD_OPTIONS = [
  { value: 7, label: 'Últimos 7 días' },
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 3 meses' },
  { value: 365, label: 'Últimos 12 meses' },
]

interface Point {
  key: string
  label: string
  createdAct: number
  assignedAct: number
  finalizedAct: number
  createdAcc: number
  assignedAcc: number
  finalizedAcc: number
  enEjecucion: number
}

function buildPoints(evolution: EvolutionPoint[]): Point[] {
  let c = 0
  let a = 0
  let f = 0
  return evolution.map((e) => {
    c += e.created
    a += e.assigned
    f += e.finalized
    return {
      key: e.key,
      label: e.label,
      createdAct: e.created,
      assignedAct: e.assigned,
      finalizedAct: e.finalized,
      createdAcc: c,
      assignedAcc: a,
      finalizedAcc: f,
      enEjecucion: c - f,
    }
  })
}

function fmtLabel(label: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    const d = new Date(`${label}T00:00:00`)
    if (!Number.isNaN(d.getTime()))
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  }
  return label
}

export function AuditEvolution({
  evolution,
  summary,
  period,
  onPeriodChange,
}: {
  evolution: EvolutionPoint[]
  summary: ReportsSummary
  period: number
  onPeriodChange: (p: number) => void
}) {
  const [mode, setMode] = useState<Mode>('activity')
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set())
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const points = useMemo(() => buildPoints(evolution), [evolution])
  const hasData = evolution.some((e) => e.created || e.assigned || e.finalized)

  const value = (s: SeriesKey, p: Point): number =>
    s === 'enEjecucion' ? p.enEjecucion : mode === 'activity' ? (p as unknown as Record<string, number>)[`${s}Act`] : (p as unknown as Record<string, number>)[`${s}Acc`]

  const visible = SERIES.filter((s) => !hidden.has(s.key))
  const allValues = points.flatMap((p) => visible.map((s) => value(s.key, p)))
  const max = Math.max(1, ...allValues)

  const totals = useMemo(() => {
    const last = points[points.length - 1]
    return {
      created: last?.createdAcc ?? 0,
      assigned: last?.assignedAcc ?? 0,
      finalized: last?.finalizedAcc ?? 0,
      enEjecucion: last?.enEjecucion ?? 0,
    }
  }, [points])

  const toggle = (k: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const onMove = (e: { clientX: number; clientY: number }) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const idx = Math.round(frac * (points.length - 1))
    setHoverIndex(Math.max(0, Math.min(points.length - 1, idx)))
  }

  const W = 760
  const H = 220
  const pad = { top: 14, right: 14, bottom: 26, left: 34 }
  const innerW = W - pad.left - pad.right
  const innerH = H - pad.top - pad.bottom
  const x = (i: number) => pad.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW)
  const y = (v: number) => pad.top + innerH - (v / max) * innerH

  const labelIndexes =
    points.length > 4
      ? [0, Math.floor((points.length - 1) / 3), Math.floor(((points.length - 1) * 2) / 3), points.length - 1]
      : points.map((_, i) => i)

  const gridFracs = [0, 0.25, 0.5, 0.75, 1]

  const reading = (() => {
    const assignPct = totals.created > 0 ? Math.round((totals.assigned / totals.created) * 100) : 0
    const parts: string[] = []
    if (summary.available > 0) parts.push(`${summary.available} servicios pendientes de asignación`)
    if (assignPct > 0) parts.push(`${assignPct}% de las oportunidades creadas ya fueron asignadas`)
    if (summary.in_execution > 0) parts.push(`${summary.in_execution} auditorías se encuentran actualmente en ejecución`)
    return parts
  })()

  const pendingGap = Math.max(0, totals.created - totals.assigned)
  const execGap = Math.max(0, totals.assigned - totals.finalized)

  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <section className="oi-panel oi-evo" aria-label="Evolución de auditorías">
      <div className="oi-evo-head">
        <h3 className="oi-panel-title">Evolución de auditorías</h3>
        <div className="oi-evo-controls">
          <select
            className="oi-period-select"
            value={period}
            onChange={(e) => onPeriodChange(Number(e.target.value))}
            aria-label="Periodo"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="oi-evo-toggle" role="tablist" aria-label="Modo de gráfica">
            <button
              type="button"
              className={`oi-evo-toggle-btn ${mode === 'activity' ? 'active' : ''}`}
              aria-selected={mode === 'activity'}
              onClick={() => setMode('activity')}
            >
              Actividad
            </button>
            <button
              type="button"
              className={`oi-evo-toggle-btn ${mode === 'accumulated' ? 'active' : ''}`}
              aria-selected={mode === 'accumulated'}
              onClick={() => setMode('accumulated')}
            >
              Acumulado
            </button>
          </div>
        </div>
      </div>

      <div className="oi-evo-legend">
        {SERIES.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`oi-evo-legend-item ${hidden.has(s.key) ? 'off' : ''}`}
            onClick={() => toggle(s.key)}
            aria-pressed={!hidden.has(s.key)}
          >
            <span className="oi-evo-swatch" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <EmptyState
          icon="◌"
          title="Sin datos suficientes para mostrar evolución"
          description="Cuando existan auditorías en el periodo seleccionado, la evolución aparecerá aquí."
        />
      ) : (
        <div className="oi-evo-wrap" ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHoverIndex(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="oi-evo-svg" role="img" aria-label="Evolución de auditorías">
            {gridFracs.map((g) => (
              <line
                key={g}
                x1={pad.left}
                x2={W - pad.right}
                y1={y(max * g)}
                y2={y(max * g)}
                stroke="#eef2f7"
                strokeWidth={1}
              />
            ))}
            {visible.map((s) => (
              <polyline
                key={s.key}
                points={points.map((p, i) => `${x(i)},${y(value(s.key, p))}`).join(' ')}
                fill="none"
                stroke={s.color}
                strokeWidth={2.6}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {hovered &&
              (() => {
                const idx = hoverIndex!
                return (
                  <g>
                    <line
                      x1={x(idx)}
                      x2={x(idx)}
                      y1={pad.top}
                      y2={H - pad.bottom}
                      stroke="#cfd9e6"
                      strokeWidth={1}
                    />
                    {visible.map((s) => (
                      <circle
                        key={s.key}
                        cx={x(idx)}
                        cy={y(value(s.key, hovered))}
                        r={4}
                        fill={s.color}
                        stroke="#fff"
                        strokeWidth={1.5}
                      />
                    ))}
                  </g>
                )
              })()}
            {labelIndexes.map((i) => (
              <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="chart-axis-label">
                {fmtLabel(points[i]?.label ?? '')}
              </text>
            ))}
          </svg>

          {hovered && hoverIndex !== null && (
            <div className="oi-evo-tooltip" style={{ left: `${(x(hoverIndex) / W) * 100}%`, top: `${(H - 8) / H * 100}%` }}>
              <div className="oi-evo-tip-title">{fmtLabel(hovered.label)}</div>
              {SERIES.map((s) => (
                <div className="oi-evo-tip-row" key={s.key}>
                  <span className="oi-evo-tip-dot" style={{ background: s.color }} />
                  <span>{s.label}</span>
                  <strong>{value(s.key, hovered)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasData && (
        <>
          <div className="oi-evo-stats">
            <div className="oi-evo-stat">
              <span className="oi-evo-stat-value">{totals.created}</span>
              <span className="oi-evo-stat-label">Creadas</span>
            </div>
            <div className="oi-evo-stat">
              <span className="oi-evo-stat-value">{totals.assigned}</span>
              <span className="oi-evo-stat-label">Asignadas</span>
            </div>
            <div className="oi-evo-stat">
              <span className="oi-evo-stat-value">{totals.enEjecucion}</span>
              <span className="oi-evo-stat-label">En ejecución</span>
            </div>
            <div className="oi-evo-stat">
              <span className="oi-evo-stat-value">{totals.finalized}</span>
              <span className="oi-evo-stat-label">Finalizadas</span>
            </div>
          </div>

          <div className="oi-evo-reading">
            {reading.length > 0 ? (
              <ul>
                {reading.map((r) => (
                  <li key={r}>
                    <span className="oi-evo-reading-dot" />
                    {r}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="muted">Sin actividad registrada en el periodo.</span>
            )}
            {(pendingGap > 0 || execGap > 0) && (
              <div className="oi-evo-gap">
                {pendingGap > 0 && <span>Acumulación de {pendingGap} servicios creados sin asignar</span>}
                {execGap > 0 && <span>{execGap} asignaciones aún sin finalizar</span>}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}
