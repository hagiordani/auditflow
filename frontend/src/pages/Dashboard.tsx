import { useEffect, useState } from 'react'
import { fetchAuditorSummary, type AuditorSummary } from '../api/reports'
import { ActiveAuditors } from '../components/dashboard/ActiveAuditors'
import { AttentionCenter } from '../components/dashboard/AttentionCenter'
import { AuditEvolution } from '../components/dashboard/AuditEvolution'
import { AuditorPerformance } from '../components/dashboard/AuditorPerformance'
import { CapacidadOperacional } from '../components/dashboard/CapacidadOperacional'
import { ClientPerformance } from '../components/dashboard/ClientPerformance'
import { EmptyState } from '../components/dashboard/EmptyState'
import { ExecutiveKpiGrid } from '../components/dashboard/ExecutiveKpiGrid'
import { GeographicBlock } from '../components/dashboard/GeographicBlock'
import { KpiCard } from '../components/dashboard/KpiCard'
import { OperationalSnapshot } from '../components/dashboard/OperationalSnapshot'
import { type Period } from '../components/dashboard/PeriodSelector'
import { KpiSkeleton, PanelSkeleton } from '../components/dashboard/Skeleton'
import { UpcomingAudits } from '../components/dashboard/UpcomingAudits'
import { useAuth } from '../context/AuthContext'
import { useDashboardData } from '../hooks/useDashboardData'
import { buildUpcoming } from '../utils/dashboard'

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

function rangeLabel(p: number): string {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - p)
  return `${fmtDate(start)} - ${fmtDate(end)} ${end.getFullYear()}`
}

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 7, label: rangeLabel(7) },
  { value: 30, label: rangeLabel(30) },
  { value: 90, label: rangeLabel(90) },
  { value: 365, label: rangeLabel(365) },
]

export function Dashboard() {
  const { user } = useAuth()
  const isStaff =
    !!user && (user.role === 'admin' || user.role === 'operations' || user.role === 'supervisor')
  const [period, setPeriod] = useState<Period>(30)

  const { data, loading, error, refetch } = useDashboardData(period, isStaff)

  // Vista del auditor: resumen personal.
  const [auditorSummary, setAuditorSummary] = useState<AuditorSummary | null>(null)
  useEffect(() => {
    if (user?.role !== 'auditor') return
    let active = true
    fetchAuditorSummary()
      .then((s) => active && setAuditorSummary(s))
      .catch(() => active && setAuditorSummary(null))
    return () => {
      active = false
    }
  }, [user])

  if (!user) return null

  if (user.role === 'auditor') {
    return (
      <div className="oi-dashboard">
        <header className="oi-header">
          <div>
            <h2 className="oi-title">Mi agenda</h2>
            <p className="oi-subtitle">Oportunidades y asignaciones que te corresponden.</p>
          </div>
        </header>
        <div className="oi-kpi-grid">
          {auditorSummary ? (
            <>
              <KpiCard label="Oportunidades disponibles" value={auditorSummary.available_opportunities} />
              <KpiCard label="Mis postulaciones" value={auditorSummary.my_applications} />
              <KpiCard label="Próximas auditorías" value={auditorSummary.upcoming_assignments} />
              <KpiCard label="Días ocupados" value={auditorSummary.occupied_days} />
              <KpiCard label="Certs. por vencer (90d)" value={auditorSummary.expiring_my_certifications_90d} />
            </>
          ) : (
            <>
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
              <KpiSkeleton />
            </>
          )}
        </div>
      </div>
    )
  }

  const upcomingCount = data ? buildUpcoming(data.calendar, data.opportunities).length : 0
  const availableAuditors = data
    ? data.auditors.filter((a) => a.availability_status === 'available').length
    : 0

  return (
    <div className="oi-dashboard">
      <header className="oi-header">
        <div className="oi-header-text">
          <h2 className="oi-title">Centro de operaciones</h2>
          <p className="oi-subtitle">Visión general del desempeño y estado de las auditorías.</p>
        </div>
        <div className="oi-header-controls">
          <button type="button" className="btn btn-ghost btn-sm oi-filters">
            Filtros
          </button>
          <select
            className="oi-period-select"
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value) as Period)}
            aria-label="Periodo"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {error ? (
        <div className="oi-error">
          <EmptyState
            icon="!"
            title="No pudimos cargar el centro de operaciones."
            description="Revisa la conexión con la API e intenta de nuevo."
            action={{ label: 'Reintentar', onClick: refetch }}
          />
        </div>
      ) : loading || !data ? (
        <div className="oi-dashboard">
          <div className="oi-kpi-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
          <PanelSkeleton rows={4} />
        </div>
      ) : (
        <div className="oi-layout">
          <ExecutiveKpiGrid
            summary={data.summary!}
            upcomingCount={upcomingCount}
            availableAuditors={availableAuditors}
            trends={data.trends}
          />

          <div className="oi-grid oi-grid-2">
            <AttentionCenter summary={data.summary!} opportunities={data.opportunities} />
            <OperationalSnapshot summary={data.summary!} />
          </div>

          <AuditEvolution
            evolution={data.evolution}
            summary={data.summary!}
            period={period}
            onPeriodChange={(p) => setPeriod(p as Period)}
          />

          <GeographicBlock
            byState={data.byState}
            opportunities={data.opportunities}
            calendar={data.calendar}
            auditors={data.auditors}
          />

          <ActiveAuditors
            calendar={data.calendar}
            opportunities={data.opportunities}
            auditors={data.auditors}
          />

          <AuditorPerformance auditors={data.auditors} perf={data.auditorPerf} />

          <ClientPerformance clients={data.clientPerf} opportunities={data.opportunities} />

          <div className="oi-grid oi-grid-2">
            <UpcomingAudits
              calendar={data.calendar}
              opportunities={data.opportunities}
              auditors={data.auditors}
            />
            <CapacidadOperacional auditors={data.auditors} demand={data.summary!.in_execution} />
          </div>
        </div>
      )}
    </div>
  )
}
