import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../api/client'
import {
  addMyAvailability,
  fetchMyAvailability,
  removeMyAvailability,
} from '../../api/availability'
import { fetchMyCalendar } from '../../api/calendar'
import type { AvailabilityBlock, CalendarEvent } from '../../api/types'
import { formatDate } from '../../utils/status'

const TYPE_LABELS: Record<string, string> = {
  vacations: 'Vacaciones',
  blocked: 'Bloqueo',
  unavailable: 'No disponible',
}

const EMPTY_FORM = { start_date: '', end_date: '', availability_type: 'unavailable', notes: '' }

export function AuditorCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([fetchMyCalendar(), fetchMyAvailability()])
      .then(([e, b]) => {
        setEvents(e)
        setBlocks(b)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await addMyAvailability({
        start_date: form.start_date,
        end_date: form.end_date,
        availability_type: form.availability_type,
        notes: form.notes.trim() || null,
      })
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: number) => {
    try {
      await removeMyAvailability(id)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div>
      <h2 className="page-title">Mi calendario</h2>
      <p className="page-subtitle">
        Servicios asignados y bloques de indisponibilidad. Los servicios confirmados bloquean
        tus fechas automáticamente.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Cargando…</p>}

      <div className="grid grid-2col">
        <section className="card">
          <h3>Próximos servicios</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Servicio</th>
                  <th>Fechas</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {events
                  .filter((e) => e.type === 'assignment')
                  .map((e) => (
                    <tr key={`a-${e.id}`}>
                      <td className="mono">{e.folio}</td>
                      <td>{e.title}</td>
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
                {events.filter((e) => e.type === 'assignment').length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Sin servicios próximos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3>Mis indisponibilidades</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fechas</th>
                  <th>Tipo</th>
                  <th>Notas</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((b) => (
                  <tr key={b.id}>
                    <td>
                      {formatDate(b.start_date)} → {formatDate(b.end_date)}
                    </td>
                    <td>
                      <span className="badge badge-unavailable">
                        {TYPE_LABELS[b.availability_type] ?? b.availability_type}
                      </span>
                    </td>
                    <td className="muted small">{b.notes || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger-ghost"
                        onClick={() => handleRemove(b.id)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                {blocks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Sin bloques de fechas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <form onSubmit={handleAdd} className="form assign-form">
            <h4>Añadir indisponibilidad</h4>
            <div className="form-row">
              <div>
                <label htmlFor="av-start">Desde</label>
                <input
                  id="av-start"
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="av-end">Hasta</label>
                <input
                  id="av-end"
                  type="date"
                  required
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
            <label htmlFor="av-type">Tipo</label>
            <select
              id="av-type"
              value={form.availability_type}
              onChange={(e) => setForm({ ...form, availability_type: e.target.value })}
            >
              <option value="unavailable">No disponible</option>
              <option value="vacations">Vacaciones</option>
              <option value="blocked">Bloqueo</option>
            </select>
            <label htmlFor="av-notes">Notas (opcional)</label>
            <input
              id="av-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            {formError && <div className="alert alert-error">{formError}</div>}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar bloque'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
