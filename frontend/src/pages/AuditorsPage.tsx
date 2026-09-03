import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createAuditor, fetchAuditors } from '../api/auditors'
import { getErrorMessage } from '../api/client'
import type { Auditor, AvailabilityStatus } from '../api/types'
import { formatMoney } from '../utils/format'

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Disponible',
  busy: 'Ocupado',
  unavailable: 'No disponible',
}

const AUDITOR_TYPE_LABELS: Record<string, string> = {
  interno: 'Interno',
  externo: 'Externo',
}

const EMPTY_FORM = {
  email: '',
  full_name: '',
  password: '',
  phone: '',
  city: '',
  state: '',
  daily_rate: '',
  auditor_type: 'externo',
  specialty: '',
  roles: '',
}

export function AuditorsPage() {
  const [auditors, setAuditors] = useState<Auditor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [linkExisting, setLinkExisting] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetchAuditors()
      .then(setAuditors)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const created = await createAuditor({
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        password: linkExisting ? null : form.password,
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
        auditor_type: form.auditor_type,
        specialty: form.specialty.trim() || null,
        roles: form.roles.trim() || null,
      })
      setAuditors((prev) => [...prev, created])
      setForm(EMPTY_FORM)
      setLinkExisting(false)
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const validCount = (a: Auditor) => a.competencies.filter((c) => c.is_valid).length

  return (
    <div>
      <h2 className="page-title">Auditores</h2>
      <p className="page-subtitle">
        Catálogo de auditores externos. Al dar de alta se crea también su cuenta de acceso
        (o se vincula a una cuenta ya existente).
      </p>

      <div className="grid grid-2col">
        <section className="card">
          <h3>Nuevo auditor</h3>
          <form onSubmit={handleCreate} className="form">
            <label htmlFor="a-name">Nombre completo</label>
            <input
              id="a-name"
              required
              minLength={2}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />

            <label htmlFor="a-email">Correo electrónico</label>
            <input
              id="a-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={linkExisting}
                onChange={(e) => setLinkExisting(e.target.checked)}
              />
              <span>La cuenta de acceso ya existe (vincular solo el perfil)</span>
            </label>

            {!linkExisting && (
              <>
                <label htmlFor="a-password">Contraseña de acceso (mín. 8 caracteres)</label>
                <input
                  id="a-password"
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </>
            )}

            <label htmlFor="a-phone">Teléfono</label>
            <input
              id="a-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />

            <div className="form-row">
              <div>
                <label htmlFor="a-city">Ciudad de residencia</label>
                <input
                  id="a-city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="a-state">Estado</label>
                <input
                  id="a-state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
            </div>

            <label htmlFor="a-rate">Tarifa diaria (MXN)</label>
            <input
              id="a-rate"
              type="number"
              min={0}
              step="0.01"
              placeholder="4500"
              value={form.daily_rate}
              onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
            />

            <div className="form-row">
              <div>
                <label htmlFor="a-type">Tipo de auditor</label>
                <select
                  id="a-type"
                  value={form.auditor_type}
                  onChange={(e) => setForm({ ...form, auditor_type: e.target.value })}
                >
                  <option value="externo">Externo</option>
                  <option value="interno">Interno</option>
                </select>
              </div>
              <div>
                <label htmlFor="a-specialty">Cargo / Especialidad</label>
                <input
                  id="a-specialty"
                  placeholder="Calidad, Seguridad…"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                />
              </div>
            </div>

            <label htmlFor="a-roles">Roles (separados por ';' — Evaluador, Inspector…)</label>
            <input
              id="a-roles"
              placeholder="Evaluador; Inspector"
              value={form.roles}
              onChange={(e) => setForm({ ...form, roles: e.target.value })}
            />

            {formError && <div className="alert alert-error">{formError}</div>}

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando…' : 'Crear auditor'}
            </button>
          </form>
        </section>

        <section className="card">
          <h3>Auditores registrados ({auditors.length})</h3>
          {loading && <p className="muted">Cargando…</p>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Cargo / Especialidad</th>
                    <th>Roles</th>
                    <th>Ciudad</th>
                    <th>Tarifa</th>
                    <th>Competencias</th>
                    <th>Disponibilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {auditors.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <Link to={`/auditors/${a.id}`} className="link">
                          {a.full_name}
                        </Link>
                        <div className="muted small">{a.email}</div>
                      </td>
                      <td>
                        <span className="badge badge-primary">
                          {AUDITOR_TYPE_LABELS[a.auditor_type] ?? '—'}
                        </span>
                      </td>
                      <td>{a.specialty || '—'}</td>
                      <td>
                        {a.roles ? (
                          <div className="oi-cred-badges">
                            {a.roles.split(';').map((r) => (
                              <span key={r.trim()} className="oi-cred-badge">
                                {r.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        {a.city || '—'}
                        {a.state ? `, ${a.state}` : ''}
                      </td>
                      <td>{formatMoney(a.daily_rate)}</td>
                      <td>
                        <span className="badge badge-primary">{validCount(a)} vigentes</span>
                      </td>
                      <td>
                        <span className={`badge badge-${a.availability_status}`}>
                          {AVAILABILITY_LABELS[a.availability_status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {auditors.length === 0 && (
                    <tr>
                      <td colSpan={8} className="muted">
                        Sin auditores todavía.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
