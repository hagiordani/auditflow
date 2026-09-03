import { useCallback, useEffect, useState } from 'react'
import { fetchStaffCalendar } from '../api/calendar'
import { fetchOpportunities } from '../api/opportunities'
import { fetchAuditors } from '../api/auditors'
import type { AuditOpportunity, Auditor, StaffCalendarEvent } from '../api/types'

export interface CalendarEventItem {
  id: number
  folio: string
  title: string
  description: string | null
  auditorName: string
  auditorType: string
  roles: string[]
  client: string | null
  city: string | null
  state: string | null
  startDate: string
  endDate: string
  status: string
  oppStatus: string
}

export interface CalendarData {
  events: CalendarEventItem[]
  availableAuditors: number
  toAssign: number
  loading: boolean
  error: string | null
  refetch: () => void
}

function buildEvents(
  calendar: StaffCalendarEvent[],
  opportunities: AuditOpportunity[],
  auditors: Auditor[],
): CalendarEventItem[] {
  const oppByFolio = new Map(opportunities.map((o) => [o.folio, o]))
  const audByName = new Map(
    auditors.map((a) => [
      a.full_name,
      {
        type: a.auditor_type,
        roles: (a.roles ?? '').split(/[;,]/).map((s) => s.trim()).filter(Boolean),
      },
    ]),
  )
  return calendar
    .filter((e) => e.start_date && e.end_date)
    .map((e) => {
      const opp = oppByFolio.get(e.folio)
      const aud = audByName.get(e.auditor_name)
      return {
        id: e.assignment_id,
        folio: e.folio,
        title: e.title,
        description: opp?.description ?? null,
        auditorName: e.auditor_name,
        auditorType: aud?.type ?? 'externo',
        roles: aud?.roles ?? [],
        client: opp?.client?.commercial_name ?? opp?.client?.business_name ?? null,
        city: opp?.city ?? e.city,
        state: opp?.state ?? e.state,
        startDate: e.start_date,
        endDate: e.end_date,
        status: e.status,
        oppStatus: opp?.status ?? '',
      }
    })
}

export function useCalendarData(enabled = true): CalendarData {
  const [events, setEvents] = useState<CalendarEventItem[]>([])
  const [availableAuditors, setAvailableAuditors] = useState(0)
  const [toAssign, setToAssign] = useState(0)
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
    Promise.all([fetchStaffCalendar(), fetchOpportunities(), fetchAuditors()])
      .then(([calendar, opportunities, auditors]) => {
        if (!active) return
        setEvents(buildEvents(calendar, opportunities, auditors))
        setAvailableAuditors(auditors.filter((a) => a.availability_status === 'available').length)
        setToAssign(
          opportunities.filter((o) => ['published', 'has_interested', 'under_review'].includes(o.status))
            .length,
        )
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError('No fue posible cargar el calendario.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [tick, enabled])

  return { events, availableAuditors, toAssign, loading, error, refetch }
}
