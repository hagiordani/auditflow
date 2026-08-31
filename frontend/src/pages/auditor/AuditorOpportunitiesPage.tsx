import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { applyToOpportunity, fetchMyOpportunities } from '../../api/portal'
import type { ApplicationDecision, AuditorOpportunity } from '../../api/types'
import { formatMoney } from '../../utils/format'
import { formatDate } from '../../utils/status'

export function AuditorOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<AuditorOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    setError('')
    fetchMyOpportunities()
      .then(setOpportunities)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleDecision = async (opp: AuditorOpportunity, decision: ApplicationDecision) => {
    setError('')
    setBusyId(opp.id)
    try {
      await applyToOpportunity(opp.id, decision)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h2 className="page-title">Oportunidades disponibles</h2>
      <p className="page-subtitle">
        Solo ves servicios compatibles con tus competencias vigentes y fechas abiertas.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted">Cargando…</p>}

      {!loading && opportunities.length === 0 && (
        <div className="card">
          <p className="muted">
            No hay oportunidades compatibles con tu perfil en este momento. Revisa más tarde.
          </p>
        </div>
      )}

      <div className="grid">
        {opportunities.map((o) => (
          <div key={o.id} className="card opp-card">
            <div className="opp-card-head">
              <span className="mono muted small">{o.folio}</span>
              {o.my_application && (
                <span
                  className={`badge ${
                    o.my_application.decision === 'interested' ? 'badge-valid' : 'badge-invalid'
                  }`}
                >
                  {o.my_application.decision === 'interested'
                    ? 'Me interesa'
                    : 'No disponible'}
                </span>
              )}
            </div>

            <h3>
              <Link to={`/auditor/opportunities/${o.id}`} className="link">
                {o.title}
              </Link>
            </h3>

            <dl className="detail-list">
              <dt>Ubicación</dt>
              <dd>
                {[o.city, o.state].filter(Boolean).join(', ') || '—'}
              </dd>
              <dt>Fechas</dt>
              <dd>
                {formatDate(o.start_date)} → {formatDate(o.end_date)} ({o.number_of_days} días)
              </dd>
              <dt>Pago</dt>
              <dd>
                <strong>{formatMoney(o.payment_amount)}</strong>
                {o.travel_expenses === 'included' && (
                  <span className="muted small"> · viáticos incluidos</span>
                )}
              </dd>
              <dt>Límite postulación</dt>
              <dd>{formatDate(o.application_deadline)}</dd>
              <dt>Requiere</dt>
              <dd>
                {o.competencies.map((c) => (
                  <span key={c.id} className="badge badge-primary tag">
                    {c.competency.name} · {c.required_level}
                  </span>
                ))}
              </dd>
            </dl>

            {o.description && <p className="muted small">{o.description}</p>}

            <div className="row-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busyId === o.id}
                onClick={() => handleDecision(o, 'interested')}
              >
                {o.my_application?.decision === 'interested'
                  ? 'Ya postulado ✓'
                  : 'Me interesa'}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busyId === o.id}
                onClick={() => handleDecision(o, 'not_available')}
              >
                No disponible
              </button>
              <Link to={`/auditor/opportunities/${o.id}`} className="btn btn-ghost btn-sm">
                Detalle
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
