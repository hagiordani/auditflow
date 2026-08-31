import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchStaffCalendar } from '../api/calendar'
import { getErrorMessage } from '../api/client'
import type { StaffCalendarEvent } from '../api/types'
import { formatDate } from '../utils/status'

export function StaffCalendarPage() {
  const [events, setEvents] = useState<StaffCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStaffCalendar()
      .then(setEvents)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h2 className="page-title">Calendario de servicios</h2>
      <p className="page-subtitle">
        Servicios con asignación pendiente o confirmada, ordenados por fecha.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Cargando…</p>}

      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Servicio</th>
                <th>Auditor</th>
                <th>Ubicación</th>
                <th>Fechas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.assignment_id}>
                  <td className="mono">{e.folio}</td>
                  <td>{e.title}</td>
                  <td>{e.auditor_name}</td>
                  <td>
                    {[e.city, e.state].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td>
                    {formatDate(e.start_date)} → {formatDate(e.end_date)}
                  </td>
                  <td>
                    <span className={`badge ${e.status === 'confirmed' ? 'badge-valid' : 'badge-busy'}`}>
                      {e.status === 'confirmed' ? 'Confirmada' : 'Por confirmar'}
                    </span>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Sin servicios programados.{' '}
                    <Link to="/opportunities" className="link">
                      Ver oportunidades
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
