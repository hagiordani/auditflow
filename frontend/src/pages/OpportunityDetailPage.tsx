import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import {
  cancelOpportunity,
  fetchOpportunity,
  fetchOpportunityHistory,
  publishOpportunity,
  transitionOpportunity,
} from '../api/opportunities'
import type { AuditLogEntry, AuditOpportunity, OpportunityStatus } from '../api/types'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../utils/format'
import {
  ACTION_LABELS,
  ALLOWED_TRANSITIONS,
  EXPENSE_LABELS,
  formatDate,
  formatDateTime,
  OPPORTUNITY_STATUS_CLASS,
  OPPORTUNITY_STATUS_LABELS,
} from '../utils/status'

export function OpportunityDetailPage() {
  const { opportunityId } = useParams()
  const id = Number(opportunityId)
  const { user } = useAuth()

  const [opportunity, setOpportunity] = useState<AuditOpportunity | null>(null)
  const [history, setHistory] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [busy, setBusy] = useState(false)

  const canEdit = user?.role === 'admin' || user?.role === 'operations'

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([fetchOpportunity(id), fetchOpportunityHistory(id)])
      .then(([o, h]) => {
        setOpportunity(o)
        setHistory(h)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!Number.isNaN(id)) load()
  }, [id, load])

  const runAction = async (action: () => Promise<AuditOpportunity>) => {
    setActionError('')
    setBusy(true)
    try {
      await action()
      load()
    } catch (err) {
      setActionError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="page-loading">Cargando…</div>
  if (error && !opportunity)
    return (
      <div>
        <div className="alert alert-error">{error}</div>
        <p>
          <Link to="/opportunities" className="link">
            ← Volver a oportunidades
          </Link>
        </p>
      </div>
    )
  if (!opportunity) return null

  const nextStates = ALLOWED_TRANSITIONS[opportunity.status] ?? []
  const activeStatuses: OpportunityStatus[] = [
    'draft',
    'published',
    'has_interested',
    'under_review',
    'assigned',
    'confirmed',
  ]

  return (
    <div>
      <p>
        <Link to="/opportunities" className="link">
          ← Volver a oportunidades
        </Link>
      </p>

      <div className="page-header-row">
        <div>
          <h2 className="page-title">
            {opportunity.folio} · {opportunity.title}
          </h2>
          <p className="page-subtitle">
            <span className={`status-badge ${OPPORTUNITY_STATUS_CLASS[opportunity.status]}`}>
              {OPPORTUNITY_STATUS_LABELS[opportunity.status]}
            </span>
            {opportunity.cancel_reason && (
              <span className="muted small"> · Motivo: {opportunity.cancel_reason}</span>
            )}
          </p>
        </div>
        {canEdit && (
          <div className="row-actions">
            {opportunity.status === 'draft' && (
              <Link to={`/opportunities/${opportunity.id}/edit`} className="btn btn-ghost">
                Editar
              </Link>
            )}
            {opportunity.status === 'draft' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => runAction(() => publishOpportunity(opportunity.id))}
              >
                Publicar
              </button>
            )}
            {nextStates
              .filter((s) => s !== 'cancelled')
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => runAction(() => transitionOpportunity(opportunity.id, s))}
                >
                  → {OPPORTUNITY_STATUS_LABELS[s]}
                </button>
              ))}
            {activeStatuses.includes(opportunity.status) && (
              <button
                type="button"
                className="btn btn-danger-ghost"
                disabled={busy}
                onClick={() => setCancelOpen(true)}
              >
                Cancelar
              </button>
            )}
          </div>
        )}
      </div>

      {actionError && <div className="alert alert-error">{actionError}</div>}

      {cancelOpen && (
        <div className="card narrow-card">
          <h3>Cancelar oportunidad</h3>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault()
              runAction(() => cancelOpportunity(opportunity.id, cancelReason))
              setCancelOpen(false)
              setCancelReason('')
            }}
          >
            <label htmlFor="cancel-reason">Motivo de la cancelación *</label>
            <input
              id="cancel-reason"
              required
              minLength={3}
              maxLength={500}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="row-actions">
              <button type="submit" className="btn btn-danger-ghost" disabled={busy}>
                Confirmar cancelación
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCancelOpen(false)}
              >
                Volver
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid">
        <section className="card">
          <h3>Detalle del servicio</h3>
          <dl className="detail-list">
            <dt>Cliente</dt>
            <dd>{opportunity.client ? opportunity.client.business_name : '—'}</dd>
            <dt>Tipo</dt>
            <dd>{opportunity.audit_type || '—'}</dd>
            <dt>Ubicación</dt>
            <dd>
              {[opportunity.city, opportunity.state].filter(Boolean).join(', ') || '—'}
              {opportunity.address && <div className="muted small">{opportunity.address}</div>}
            </dd>
            <dt>Fechas</dt>
            <dd>
              {formatDate(opportunity.start_date)} → {formatDate(opportunity.end_date)} (
              {opportunity.number_of_days} días)
            </dd>
            <dt>Límite postulación</dt>
            <dd>{formatDate(opportunity.application_deadline)}</dd>
            <dt>Pago</dt>
            <dd>{formatMoney(opportunity.payment_amount)}</dd>
            <dt>Viáticos</dt>
            <dd>{EXPENSE_LABELS[opportunity.travel_expenses] ?? '—'}</dd>
            <dt>Hospedaje</dt>
            <dd>{EXPENSE_LABELS[opportunity.lodging] ?? '—'}</dd>
            <dt>Transporte</dt>
            <dd>{EXPENSE_LABELS[opportunity.transportation] ?? '—'}</dd>
            <dt>Auditores requeridos</dt>
            <dd>{opportunity.auditors_required}</dd>
            <dt>Responsable</dt>
            <dd>{opportunity.responsible?.full_name ?? '—'}</dd>
          </dl>
          {opportunity.description && (
            <>
              <h4 className="detail-sub">Descripción</h4>
              <p>{opportunity.description}</p>
            </>
          )}
        </section>

        <section className="card">
          <h3>Competencias requeridas</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Competencia</th>
                  <th>Nivel requerido</th>
                </tr>
              </thead>
              <tbody>
                {opportunity.competencies.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.competency.name}</strong>
                    </td>
                    <td>{c.required_level}</td>
                  </tr>
                ))}
                {opportunity.competencies.length === 0 && (
                  <tr>
                    <td colSpan={2} className="muted">
                      Sin competencias requeridas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card card-wide">
          <h3>Historial de cambios</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{formatDateTime(h.created_at)}</td>
                    <td>{h.user?.full_name ?? '—'}</td>
                    <td>
                      <span className="badge badge-primary">{ACTION_LABELS[h.action] ?? h.action}</span>
                    </td>
                    <td className="muted small">
                      {h.new_data
                        ? JSON.stringify(h.new_data)
                        : h.previous_data
                          ? `antes: ${JSON.stringify(h.previous_data)}`
                          : ''}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Sin acciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {canEdit && opportunity.status === 'draft' && (
        <p className="muted small">
          * Esta oportunidad está en Borrador: puedes editarla o publicarla para que aparezca en
          el portal de los auditores compatibles.
        </p>
      )}
    </div>
  )
}
