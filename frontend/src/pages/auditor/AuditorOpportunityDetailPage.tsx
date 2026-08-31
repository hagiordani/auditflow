import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { applyToOpportunity, fetchMyOpportunities } from '../../api/portal'
import type { ApplicationDecision, AuditorOpportunity } from '../../api/types'
import { formatMoney } from '../../utils/format'
import { EXPENSE_LABELS, formatDate } from '../../utils/status'

export function AuditorOpportunityDetailPage() {
  const { opportunityId } = useParams()
  const id = Number(opportunityId)
  const navigate = useNavigate()

  const [opportunity, setOpportunity] = useState<AuditorOpportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comments, setComments] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (Number.isNaN(id)) return
    setLoading(true)
    fetchMyOpportunities()
      .then((list) => {
        const found = list.find((o) => o.id === id)
        if (!found) {
          setError('La oportunidad no está disponible para tu perfil o ya cerró.')
          return
        }
        setOpportunity(found)
        setComments(found.my_application?.comments ?? '')
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  const handleDecision = async (decision: ApplicationDecision) => {
    if (!opportunity) return
    setError('')
    setBusy(true)
    try {
      await applyToOpportunity(opportunity.id, decision, comments.trim() || undefined)
      navigate('/auditor/opportunities')
    } catch (err) {
      setError(getErrorMessage(err))
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
          <Link to="/auditor/opportunities" className="link">
            ← Volver a oportunidades
          </Link>
        </p>
      </div>
    )
  if (!opportunity) return null

  const myDecision = opportunity.my_application?.decision

  return (
    <div>
      <p>
        <Link to="/auditor/opportunities" className="link">
          ← Volver a oportunidades
        </Link>
      </p>

      <h2 className="page-title">
        {opportunity.folio} · {opportunity.title}
      </h2>
      <p className="page-subtitle">Revisa las condiciones y decide si te interesa participar.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid">
        <section className="card">
          <h3>Condiciones del servicio</h3>
          <dl className="detail-list">
            <dt>Tipo</dt>
            <dd>{opportunity.audit_type || '—'}</dd>
            <dt>Ubicación</dt>
            <dd>
              {[opportunity.city, opportunity.state].filter(Boolean).join(', ') || '—'}
              {opportunity.address && (
                <div className="muted small">{opportunity.address}</div>
              )}
            </dd>
            <dt>Fechas</dt>
            <dd>
              {formatDate(opportunity.start_date)} → {formatDate(opportunity.end_date)} (
              {opportunity.number_of_days} días)
            </dd>
            <dt>Límite para postularse</dt>
            <dd>{formatDate(opportunity.application_deadline)}</dd>
            <dt>Pago ofrecido</dt>
            <dd>
              <strong>{formatMoney(opportunity.payment_amount)}</strong>
            </dd>
            <dt>Viáticos</dt>
            <dd>{EXPENSE_LABELS[opportunity.travel_expenses] ?? '—'}</dd>
            <dt>Hospedaje</dt>
            <dd>{EXPENSE_LABELS[opportunity.lodging] ?? '—'}</dd>
            <dt>Transporte</dt>
            <dd>{EXPENSE_LABELS[opportunity.transportation] ?? '—'}</dd>
            <dt>Auditores requeridos</dt>
            <dd>{opportunity.auditors_required}</dd>
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
          <ul className="plain-list">
            {opportunity.competencies.map((c) => (
              <li key={c.id}>
                <strong>{c.competency.name}</strong> — nivel {c.required_level}
              </li>
            ))}
          </ul>

          <h4 className="detail-sub">Tu decisión</h4>
          {myDecision && (
            <p>
              Ya respondiste:{' '}
              <span className={`badge ${myDecision === 'interested' ? 'badge-valid' : 'badge-invalid'}`}>
                {myDecision === 'interested' ? 'Me interesa' : 'No disponible'}
              </span>{' '}
              · puedes cambiarla mientras la oportunidad siga abierta.
            </p>
          )}

          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault()
              handleDecision('interested')
            }}
          >
            <label htmlFor="comments">Comentarios (opcional)</label>
            <textarea
              id="comments"
              rows={3}
              maxLength={1000}
              placeholder="p. ej. Disponible en esas fechas, con experiencia en el sector…"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />

            <div className="row-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {myDecision === 'interested' ? 'Actualizar postulación' : 'Me interesa'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => handleDecision('not_available')}
              >
                No disponible
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
