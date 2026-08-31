import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../api/client'
import {
  confirmAssignment,
  fetchMyAssignments,
  rejectAssignment,
} from '../../api/assignments'
import type { MyAssignment } from '../../api/types'
import { formatMoney } from '../../utils/format'
import {
  EXPENSE_LABELS,
  formatDate,
  OPPORTUNITY_STATUS_CLASS,
  OPPORTUNITY_STATUS_LABELS,
} from '../../utils/status'

const ASSIGNMENT_LABELS: Record<string, string> = {
  pending: 'Por confirmar',
  confirmed: 'Confirmada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
}

const ASSIGNMENT_CLASS: Record<string, string> = {
  pending: 'badge-busy',
  confirmed: 'badge-valid',
  rejected: 'badge-invalid',
  cancelled: 'badge-unavailable',
}

export function AuditorAssignmentsPage() {
  const [assignments, setAssignments] = useState<MyAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    setError('')
    fetchMyAssignments()
      .then(setAssignments)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleAction = async (id: number, action: 'confirm' | 'reject') => {
    setError('')
    setBusyId(id)
    try {
      if (action === 'confirm') await confirmAssignment(id)
      else await rejectAssignment(id)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h2 className="page-title">Mis servicios</h2>
      <p className="page-subtitle">
        Servicios que te fueron asignados. Confirma tu participación para bloquear las fechas.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && assignments.length === 0 && (
        <div className="card">
          <p className="muted">Aún no tienes servicios asignados.</p>
        </div>
      )}

      <div className="grid">
        {assignments.map((a) => (
          <div key={a.id} className="card opp-card">
            <div className="opp-card-head">
              <span className="mono muted small">{a.opportunity.folio}</span>
              <span className={`badge ${ASSIGNMENT_CLASS[a.status]}`}>
                {ASSIGNMENT_LABELS[a.status] ?? a.status}
              </span>
            </div>

            <h3>{a.opportunity.title}</h3>

            <dl className="detail-list">
              <dt>Cliente</dt>
              <dd>
                {a.client
                  ? a.client.commercial_name || a.client.business_name
                  : '—'}
              </dd>
              <dt>Ubicación</dt>
              <dd>
                {a.client
                  ? [a.client.city, a.client.state].filter(Boolean).join(', ') || '—'
                  : '—'}
                {a.client?.address && (
                  <div className="muted small">{a.client.address}</div>
                )}
              </dd>
              <dt>Fechas</dt>
              <dd>
                {formatDate(a.opportunity.start_date)} → {formatDate(a.opportunity.end_date)} (
                {a.opportunity.number_of_days} días)
              </dd>
              <dt>Pago acordado</dt>
              <dd>
                <strong>{formatMoney(a.payment_amount)}</strong>
              </dd>
              <dt>Viáticos</dt>
              <dd>{EXPENSE_LABELS[a.travel_expenses] ?? '—'}</dd>
              <dt>Hospedaje</dt>
              <dd>{EXPENSE_LABELS[a.lodging] ?? '—'}</dd>
              <dt>Transporte</dt>
              <dd>{EXPENSE_LABELS[a.transportation] ?? '—'}</dd>
              <dt>Estado del servicio</dt>
              <dd>
                <span
                  className={`status-badge ${OPPORTUNITY_STATUS_CLASS[a.opportunity.status]}`}
                >
                  {OPPORTUNITY_STATUS_LABELS[a.opportunity.status]}
                </span>
              </dd>
            </dl>

            {a.status === 'pending' && (
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busyId === a.id}
                  onClick={() => handleAction(a.id, 'confirm')}
                >
                  Confirmar servicio
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busyId === a.id}
                  onClick={() => handleAction(a.id, 'reject')}
                >
                  Rechazar
                </button>
              </div>
            )}

            {a.status === 'confirmed' && (
              <p className="muted small">
                Confirmado el {formatDate(a.confirmed_at?.slice(0, 10))}. Las fechas quedaron
                bloqueadas en tu calendario.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
