import api from './client'
import type { CalendarEvent, StaffCalendarEvent } from './types'

export async function fetchMyCalendar(): Promise<CalendarEvent[]> {
  const { data } = await api.get<CalendarEvent[]>('/auditors/me/calendar')
  return data
}

export async function fetchStaffCalendar(): Promise<StaffCalendarEvent[]> {
  const { data } = await api.get<StaffCalendarEvent[]>('/calendar')
  return data
}
