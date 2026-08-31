import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  assignCompetency,
  fetchAuditor,
  removeCompetency,
} from '../api/auditors'
import { getErrorMessage } from '../api/client'
import { fetchCompetencies } from '../api/competencies'
import type { Auditor, Competency } from '../api/types'
import { formatMoney } from '../utils/format'

const LEVELS = ['Auditor', 'Auditor líder', 'Auditor técnico', 'Especialista']

const AVAILABILITY_LABELS: Record<string, string> = {
  available: 'Disponible',
  busy: 'Ocupado',
  unavailable: 'No disponible',
}

const EMPTY_FORM = {
  competency_id: '',
  level: 'Auditor',
  certificate_number: '',
  valid_from: '',
  valid_until: '',
}

export function AuditorDetailPage() {
  const { auditorId } = useParams()
  const id = Number(auditorId)

  const [auditor, setAuditor] = useState<Auditor | null>(null)
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([fetchAuditor(id), fetchCompetencies()])
      .then(([a, c]) => {
        setAuditor(a)
        setCompetencies(c.filter((comp) => comp.is_active))
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!Number.isNaN(id)) load()
  }, [id, load])

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setMessage('')
    setSaving(true)
    try {
      const updated = await assignCompetency(id, {
        competency_id: Number(form.competency_id),
        level: form.level,
        certificate_number: form.certificate_number.trim() || null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
      })
      setAuditor(updated)
      setForm(EMPTY_FORM)
      setMessage('Competencia asignada correctamente.')
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (assignmentId: number) => {
    setMessage('')
    try {
      const updated = await removeCompetency(id, assignmentId)
      setAuditor(updated)
      setMessage('Competencia retirada del auditor.')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (loading) return <div className="page-loading">Cargando…</div>
  if (error && !auditor)
    return (
      <div>
        <div className="alert alert-error">{error}</div>
        <p>
          <Link to="/auditors" className="link">
            ← Volver a auditores
          </Link>
        </p>
      </div>
    )
  if (!auditor) return null

  const assignedIds = new Set(auditor.competencies.map((c) => c.competency.id))
  const availableCompetencies = competencies.filter((c) => !assignedIds.has(c.id))

  return (
    <div>
      <p>
        <Link to="/auditors" className="link">
          ← Volver a auditores
        </Link>
      </p>
      <h2 className="page-title">{auditor.full_name}</h2>
      <p className="page-subtitle">
        Perfil del auditor y su matriz de competencias con vigencias.
      </p>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="grid grid-2col">
        <section className="card">
          <h3>Perfil</h3>
          <dl className="detail-list">
            <dt>Correo</dt>
            <dd>{auditor.email}</dd>
            <dt>Teléfono</dt>
            <dd>{auditor.phone || '—'}</dd>
            <dt>Ciudad</dt>
            <dd>
              {[auditor.city, auditor.state].filter(Boolean).join(', ') || '—'}
            </dd>
            <dt>Tarifa diaria</dt>
            <dd>{formatMoney(auditor.daily_rate)}</dd>
            <dt>Disponibilidad</dt>
            <dd>
              <span className={`badge badge-${auditor.availability_status}`}>
                {AVAILABILITY_LABELS[auditor.availability_status]}
              </span>
            </dd>
            <dt>RFC</dt>
            <dd>{auditor.tax_id || '—'}</dd>
            <dt>Cuenta</dt>
            <dd>
              <span className={`badge ${auditor.is_active ? 'badge-valid' : 'badge-invalid'}`}>
                {auditor.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </dd>
            <dt>Notas</dt>
            <dd className="muted">{auditor.notes || '—'}</dd>
          </dl>
        </section>

        <section className="card">
          <h3>Matriz de competencias</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Competencia</th>
                  <th>Nivel</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th></th>
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
                      {ac.valid_from || '—'} → {ac.valid_until || 'indefinida'}
                    </td>
                    <td>
                      <span className={`badge ${ac.is_valid ? 'badge-valid' : 'badge-invalid'}`}>
                        {ac.is_valid ? 'Vigente' : 'Vencida'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger-ghost"
                        onClick={() => handleRemove(ac.id)}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
                {auditor.competencies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      Sin competencias asignadas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {availableCompetencies.length > 0 && (
            <form onSubmit={handleAssign} className="form assign-form">
              <h4>Asignar competencia</h4>
              <label htmlFor="ac-comp">Competencia</label>
              <select
                id="ac-comp"
                required
                value={form.competency_id}
                onChange={(e) => setForm({ ...form, competency_id: e.target.value })}
              >
                <option value="">Selecciona…</option>
                {availableCompetencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <label htmlFor="ac-level">Nivel</label>
              <select
                id="ac-level"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

              <label htmlFor="ac-cert">Número de certificado</label>
              <input
                id="ac-cert"
                value={form.certificate_number}
                onChange={(e) => setForm({ ...form, certificate_number: e.target.value })}
              />

              <div className="form-row">
                <div>
                  <label htmlFor="ac-from">Vigencia desde</label>
                  <input
                    id="ac-from"
                    type="date"
                    value={form.valid_from}
                    onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="ac-until">Vigencia hasta</label>
                  <input
                    id="ac-until"
                    type="date"
                    value={form.valid_until}
                    onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  />
                </div>
              </div>

              {formError && <div className="alert alert-error">{formError}</div>}

              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Asignando…' : 'Asignar competencia'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
