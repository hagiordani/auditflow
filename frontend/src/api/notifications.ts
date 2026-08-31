import api from './client'
import type { AppNotification } from './types'

export async function fetchMyNotifications(): Promise<AppNotification[]> {
  const { data } = await api.get<AppNotification[]>('/notifications')
  return data
}

export async function fetchUnreadCount(): Promise<{ unread: number }> {
  const { data } = await api.get<{ unread: number }>('/notifications/unread-count')
  return data
}

export async function markNotificationRead(id: number): Promise<AppNotification> {
  const { data } = await api.post<AppNotification>(`/notifications/${id}/read`)
  return data
}

export async function markAllNotificationsRead(): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/notifications/read-all')
  return data
}
