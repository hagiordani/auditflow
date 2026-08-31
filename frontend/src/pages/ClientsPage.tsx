import { useEffect, useState, type FormEvent } from 'react'
import { createClient, fetchClients } from '../api/clients'
import { getErrorMessage } from '../api/client'
import type { Client } from '../api/types'

const EMPTY_FORM = {
  business_name: '',
  commercial_name: '',
  tax_id: '',
  address: '',
  city: '',
  state: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  notes: '',
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetchClients()
      .then(setClients)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const created = await createClient({
        business_name: form.business_name.trim(),
        commercial_name: form.commercial_name.trim() || null,
        tax_id: form.tax_id.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        notes: form.notes.trim() || null,
      })
      setClients((prev) =>
        [...prev, created].sort((a, b) => a.business_name.localeCompare(b.business_name)),
      )
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="page-title">Clientes</h2>
      <p className="page-subtitle">
        Empresas que reciben los servicios de auditoría y sus contactos.
      </p>

      <div className="grid grid-2col">
        <section className="card">
          <h3>Nuevo cliente</h3>
          <form onSubmit={handleCreate} className="form">
            <label htmlFor="cl-business">Razón social *</label>
            <input
              id="cl-business"
              required
              minLength={2}
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            />

            <label htmlFor="cl-commercial">Nombre comercial</label>
            <input
              id="cl-commercial"
              value={form.commercial_name}
              onChange={(e) => setForm({ ...form, commercial_name: e.target.value })}
            />

            <label htmlFor="cl-tax">RFC</label>
            <input
              id="cl-tax"
              value={form.tax_id}
              onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
            />

            <label htmlFor="cl-address">Dirección</label>
            <input
              id="cl-address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />

            <div className="form-row">
              <div>
                <label htmlFor="cl-city">Ciudad</label>
                <input
                  id="cl-city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="cl-state">Estado</label>
                <input
                  id="cl-state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
            </div>

            <label htmlFor="cl-contact">Contacto</label>
            <input
              id="cl-contact"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />

            <div className="form-row">
              <div>
                <label htmlFor="cl-contact-email">Correo del contacto</label>
                <input
                  id="cl-contact-email"
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="cl-contact-phone">Teléfono</label>
                <input
                  id="cl-contact-phone"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                />
              </div>
            </div>

            {formError && <div className="alert alert-error">{formError}</div>}

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando…' : 'Crear cliente'}
            </button>
          </form>
        </section>

        <section className="card">
          <h3>Clientes registrados ({clients.length})</h3>
          {loading && <p className="muted">Cargando…</p>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Razón social</th>
                    <th>Ciudad</th>
                    <th>Contacto</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.business_name}</strong>
                        {c.commercial_name && (
                          <div className="muted small">{c.commercial_name}</div>
                        )}
                      </td>
                      <td>
                        {c.city || '—'}
                        {c.state ? `, ${c.state}` : ''}
                      </td>
                      <td>
                        {c.contact_name || '—'}
                        {c.contact_email && (
                          <div className="muted small">{c.contact_email}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {clients.length === 0 && (
                    <tr>
                      <td colSpan={3} className="muted">
                        Sin clientes todavía.
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
