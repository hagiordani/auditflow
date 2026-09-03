import { useCallback, useEffect, useState } from 'react'
import { fetchAuditors } from '../api/auditors'
import { fetchStaffCalendar } from '../api/calendar'
import { fetchOpportunities } from '../api/opportunities'
import {
  fetchAuditorPerformance,
  fetchByState,
  fetchClientPerformance,
  fetchEvolution,
  fetchExpiringCertifications,
  fetchSummary,
  fetchTrends,
  type AuditorPerformance,
  type ByStateMetric,
  type ClientPerformance,
  type EvolutionPoint,
  type ExpiringCertification,
  type ReportsSummary,
  type TrendsResponse,
} from '../api/reports'
import type { AuditOpportunity, Auditor, StaffCalendarEvent } from '../api/types'

export interface DashboardData {
  summary: ReportsSummary | null
  auditorPerf: AuditorPerformance[]
  clientPerf: ClientPerformance[]
  byState: ByStateMetric[]
  evolution: EvolutionPoint[]
  expiringCerts: ExpiringCertification[]
  calendar: StaffCalendarEvent[]
  opportunities: AuditOpportunity[]
  auditors: Auditor[]
  trends: TrendsResponse | null
}

export interface DashboardState {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/** Carga en paralelo todos los datasets del centro de operaciones (solo staff). */
export function useDashboardData(period: number, enabled = true): DashboardState {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    Promise.all([
      fetchSummary(),
      fetchAuditorPerformance(),
      fetchClientPerformance(),
      fetchByState(),
      fetchEvolution(period),
      fetchExpiringCertifications(60),
      fetchStaffCalendar(),
      fetchOpportunities(),
      fetchAuditors(),
      fetchTrends(period),
    ])
      .then(
        ([
          summary,
          auditorPerf,
          clientPerf,
          byState,
          evolution,
          expiringCerts,
          calendar,
          opportunities,
          auditors,
          trends,
        ]) => {
          if (!active) return
          setData({
            summary,
            auditorPerf,
            clientPerf,
            byState,
            evolution,
            expiringCerts,
            calendar,
            opportunities,
            auditors,
            trends,
          })
          setLoading(false)
        },
      )
      .catch(() => {
        if (!active) return
        setError('No pudimos cargar el centro de operaciones.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [period, tick, enabled])

  return { data, loading, error, refetch }
}
