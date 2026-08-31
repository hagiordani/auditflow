import { useCallback, useEffect, useState } from 'react'
import {
  fetchMyNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
} from '../api/notifications'
import type { AppNotification } from '../api/types'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<AppNotification[]>([])

  const refreshUnread = useCallback(() => {
    fetchUnreadCount()
      .then((r) => setUnread(r.unread))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    refreshUnread()
    const timer = setInterval(refreshUnread, 60_000)
    return () => clearInterval(timer)
  }, [refreshUnread])

  const toggle = async () => {
    if (!open) {
      try {
        setItems(await fetchMyNotifications())
      } catch {
        setItems([])
      }
    }
    setOpen((v) => !v)
  }

  const markAll = async () => {
    try {
      await markAllNotificationsRead()
      setUnread(0)
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      /* sin acción */
    }
  }

  return (
    <div className="notif-bell">
      <button type="button" className="bell-btn" onClick={toggle} title="Notificaciones">
        🔔
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>Notificaciones</strong>
            {unread > 0 && (
              <button type="button" className="link small" onClick={markAll}>
                Marcar todas leídas
              </button>
            )}
          </div>
          <div className="notif-list">
            {items.length === 0 && <p className="muted small">Sin notificaciones.</p>}
            {items.map((n) => (
              <div key={n.id} className={`notif-item ${n.is_read ? '' : 'notif-unread'}`}>
                <div className="notif-title">{n.title}</div>
                <div className="muted small">{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
