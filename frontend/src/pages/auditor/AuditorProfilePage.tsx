import { useEffect, useState } from 'react'
import { getErrorMessage } from '../../api/client'
import { fetchMyAuditorProfile } from '../../api/portal'
import type { Auditor } from '../../api/types'
import { formatMoney } from '../../utils/format'
import { formatDate } from '../../utils/status'

const AVAILABILITY_LABELS: Record<string, string> = {
  available: 'Disponible',
  busy: 'Ocupado',
  unavailable: 'No disponible',
}

export function AuditorProfilePage() {
  const [auditor, setAuditor] = useState<Auditor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchMyAuditorProfile()
      .then(setAuditor)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading">Cargando…</div>
  if (error)
    return (
      <div>
        <div className="alert alert-error">{error}</div>
      </div>
    )
  if (!auditor) return null

  return (
    <div>
      <h2 className="page-title">Mi perfil</h2>
      <p className="page-subtitle">Tu información y matriz de competencias.</p>

      <div className="grid">
        <section className="card">
          <h3>Datos de contacto</h3>
          <dl className="detail-list">
            <dt>Nombre</dt>
            <dd>{auditor.full_name}</dd>
            <dt>Correo</dt>
            <dd>{auditor.email}</dd>
            <dt>Teléfono</dt>
            <dd>{auditor.phone || '—'}</dd>
            <dt>Ciudad</dt>
            <dd>{[auditor.city, auditor.state].filter(Boolean).join(', ') || '—'}</dd>
            <dt>Tarifa diaria</dt>
            <dd>{formatMoney(auditor.daily_rate)}</dd>
            <dt>Disponibilidad</dt>
            <dd>
              <span className={`badge badge-${auditor.availability_status}`}>
                {AVAILABILITY_LABELS[auditor.availability_status] ?? auditor.availability_status}
              </span>
            </dd>
            <dt>Cuenta</dt>
            <dd>
              <span className={`badge ${auditor.is_active ? 'badge-valid' : 'badge-invalid'}`}>
                {auditor.is_active ? 'Activa' : 'Inactiva'}
              </span>
            </dd>
          </dl>
        </section>

        <section className="card">
          <h3>Mis competencias</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Competencia</th>
                  <th>Nivel</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {auditor.competencies.map((ac) => (
                  <tr key={ac.id}>
                    <td>
                      <strong>{ac.competency.name}</strong>
                      {ac.certificate_number && (
                        <div className="muted small">Cert. {ac.certificate_number}</div>
                      )}
                    </td>
                    <td>{ac.level}</td>
                    <td>
                      {formatDate(ac.valid_from)} → {formatDate(ac.valid_until)}
                    </td>
                    <td>
                      <span className={`badge ${ac.is_valid ? 'badge-valid' : 'badge-invalid'}`}>
                        {ac.is_valid ? 'Vigente' : 'Vencida'}
                      </span>
                    </td>
                  </tr>
                ))}
                {auditor.competencies.length === 0 && (
                  <tr>
                    <td colSpan={4} className="muted">
                      Sin competencias asignadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            Si necesitas actualizar tus certificaciones, contacta al equipo de operaciones.
          </p>
        </section>
      </div>
    </div>
  )
}
