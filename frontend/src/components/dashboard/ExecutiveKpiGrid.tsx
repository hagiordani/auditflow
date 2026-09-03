import { useNavigate } from 'react-router-dom'
import type { ReportsSummary, TrendsResponse } from '../../api/reports'
import { buildKpis } from '../../utils/dashboard'
import { KpiCard } from './KpiCard'

/** Fila de KPIs operacionales (Executive KPI Strip). */
export function ExecutiveKpiGrid({
  summary,
  upcomingCount,
  availableAuditors,
  trends,
}: {
  summary: ReportsSummary
  upcomingCount: number
  availableAuditors: number
  trends?: TrendsResponse | null
}) {
  const navigate = useNavigate()
  const kpis = buildKpis(summary, upcomingCount, availableAuditors, trends)

  return (
    <section className="oi-kpi-grid" aria-label="Indicadores clave">
      {kpis.map((k) => (
        <KpiCard
          key={k.label}
          label={k.label}
          value={k.value}
          icon={k.icon}
          hint={k.hint}
          trend={k.trend}
          tone={k.tone}
          onClick={k.to ? () => navigate(k.to!) : undefined}
        />
      ))}
    </section>
  )
}
