import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchClients } from '../api/clients'
import { getErrorMessage } from '../api/client'
import { fetchCompetencies } from '../api/competencies'
import {
  createOpportunity,
  fetchOpportunity,
  updateOpportunity,
  type OpportunityCompetencyInput,
} from '../api/opportunities'
import { fetchUsers } from '../api/auth'
import type { Client, Competency, User } from '../api/types'

const LEVELS = ['Auditor', 'Auditor líder', 'Auditor técnico', 'Especialista']

interface FormState {
  client_id: string
  title: string
  description: string
  audit_type: string
  city: string
  state: string
  address: string
  start_date: string
  end_date: string
  number_of_days: string
  payment_amount: string
  travel_expenses: string
  lodging: string
  transportation: string
  application_deadline: string
  auditors_required: string
  responsible_user_id: string
}

const EMPTY_FORM: FormState = {
  client_id: '',
  title: '',
  description: '',
  audit_type: 'Certificación',
  city: '',
  state: '',
  address: '',
  start_date: '',
  end_date: '',
  number_of_days: '1',
  payment_amount: '',
  travel_expenses: 'not_included',
  lodging: 'not_included',
  transportation: 'not_included',
  application_deadline: '',
  auditors_required: '1',
  responsible_user_id: '',
}

export function OpportunityFormPage() {
  const { opportunityId } = useParams()
  const navigate = useNavigate()
  const isEdit = opportunityId !== undefined

  const [clients, setClients] = useState<Client[]>([])
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [staffUsers, setStaffUsers] = useState<User[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [compRows, setCompRows] = useState<OpportunityCompetencyInput[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setError('')
    Promise.all([fetchClients(), fetchCompetencies(), fetchUsers()])
      .then(([cls, comps, users]) => {
        setClients(cls)
        setCompetencies(comps.filter((c) => c.is_active))
        setStaffUsers(users.filter((u) => u.role === 'admin' || u.role === 'operations'))
      })
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => {
    load()
    if (isEdit && opportunityId) {
      setLoading(true)
      fetchOpportunity(Number(opportunityId))
        .then((o) => {
          if (o.status !== 'draft') {
            setError('Solo se puede editar una oportunidad en estado Borrador.')
            return
          }
          setForm({
            client_id: o.client ? String(o.client.id) : '',
            title: o.title,
            description: o.description || '',
            audit_type: o.audit_type || '',
            city: o.city || '',
            state: o.state || '',
            address: o.address || '',
            start_date: o.start_date || '',
            end_date: o.end_date || '',
            number_of_days: String(o.number_of_days),
            payment_amount: o.payment_amount != null ? String(o.payment_amount) : '',
            travel_expenses: o.travel_expenses,
            lodging: o.lodging,
            transportation: o.transportation,
            application_deadline: o.application_deadline || '',
            auditors_required: String(o.auditors_required),
            responsible_user_id: o.responsible ? String(o.responsible.id) : '',
          })
          setCompRows(
            o.competencies.map((c) => ({
              competency_id: c.competency.id,
              required_level: c.required_level,
            })),
          )
        })
        .catch((err) => setError(getErrorMessage(err)))
        .finally(() => setLoading(false))
    }
  }, [isEdit, opportunityId, load])

  const set = (field: keyof FormState, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const addCompRow = () => {
    const used = new Set(compRows.map((r) => r.competency_id))
    const next = competencies.find((c) => !used.has(c.id))
    if (next) setCompRows((rows) => [...rows, { competency_id: next.id, required_level: 'Auditor' }])
  }

  const updateCompRow = (index: number, patch: Partial<OpportunityCompetencyInput>) => {
    setCompRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  const removeCompRow = (index: number) => {
    setCompRows((rows) => rows.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    const payload = {
      client_id: form.client_id ? Number(form.client_id) : null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      audit_type: form.audit_type.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      address: form.address.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      number_of_days: Number(form.number_of_days),
      payment_amount: form.payment_amount ? Number(form.payment_amount) : null,
      travel_expenses: form.travel_expenses,
      lodging: form.lodging,
      transportation: form.transportation,
      application_deadline: form.application_deadline || null,
      auditors_required: Number(form.auditors_required),
      responsible_user_id: form.responsible_user_id ? Number(form.responsible_user_id) : null,
      competencies: compRows,
    }
    try {
      if (isEdit && opportunityId) {
        await updateOpportunity(Number(opportunityId), payload)
        navigate(`/opportunities/${opportunityId}`)
      } else {
        const created = await createOpportunity(payload)
        navigate(`/opportunities/${created.id}`)
      }
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="page-loading">Cargando…</div>

  return (
    <div>
      <p>
        <Link to="/opportunities" className="link">
          ← Volver a oportunidades
        </Link>
      </p>
      <h2 className="page-title">{isEdit ? 'Editar oportunidad (borrador)' : 'Nueva oportunidad'}</h2>
      <p className="page-subtitle">
        El folio se genera automáticamente. La oportunidad queda en Borrador hasta publicarla.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {!error && (
        <form onSubmit={handleSubmit} className="card form">
          <div className="form-grid">
            <div>
              <label htmlFor="op-title">Título del servicio *</label>
              <input
                id="op-title"
                required
                minLength={3}
                placeholder="Auditoría de certificación en planta"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="op-type">Tipo de auditoría</label>
              <input
                id="op-type"
                list="audit-types"
                value={form.audit_type}
                onChange={(e) => set('audit_type', e.target.value)}
              />
              <datalist id="audit-types">
                <option value="Certificación" />
                <option value="Vigilancia" />
                <option value="Renovación" />
                <option value="Primera parte" />
              </datalist>
            </div>

            <div>
              <label htmlFor="op-client">Cliente *</label>
              <select
                id="op-client"
                required
                value={form.client_id}
                onChange={(e) => set('client_id', e.target.value)}
              >
                <option value="">Selecciona…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.commercial_name || c.business_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="op-responsible">Responsable interno</label>
              <select
                id="op-responsible"
                value={form.responsible_user_id}
                onChange={(e) => set('responsible_user_id', e.target.value)}
              >
                <option value="">Selecciona…</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="op-city">Ciudad</label>
              <input id="op-city" value={form.city} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div>
              <label htmlFor="op-state">Estado</label>
              <input id="op-state" value={form.state} onChange={(e) => set('state', e.target.value)} />
            </div>

            <div className="form-span">
              <label htmlFor="op-address">Dirección</label>
              <input
                id="op-address"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="op-start">Fecha de inicio *</label>
              <input
                id="op-start"
                type="date"
                required
                value={form.start_date}
                onChange={(e) => set('start_date', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="op-end">Fecha de finalización *</label>
              <input
                id="op-end"
                type="date"
                required
                value={form.end_date}
                onChange={(e) => set('end_date', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="op-days">Número de días</label>
              <input
                id="op-days"
                type="number"
                min={1}
                max={90}
                required
                value={form.number_of_days}
                onChange={(e) => set('number_of_days', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="op-deadline">Fecha límite para postularse *</label>
              <input
                id="op-deadline"
                type="date"
                required
                value={form.application_deadline}
                onChange={(e) => set('application_deadline', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="op-payment">Pago ofrecido (MXN)</label>
              <input
                id="op-payment"
                type="number"
                min={0}
                step="0.01"
                placeholder="12000"
                value={form.payment_amount}
                onChange={(e) => set('payment_amount', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="op-auditors">Nº de auditores requeridos</label>
              <input
                id="op-auditors"
                type="number"
                min={1}
                max={10}
                required
                value={form.auditors_required}
                onChange={(e) => set('auditors_required', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="op-travel">Viáticos</label>
              <select
                id="op-travel"
                value={form.travel_expenses}
                onChange={(e) => set('travel_expenses', e.target.value)}
              >
                <option value="included">Incluidos</option>
                <option value="not_included">No incluidos</option>
              </select>
            </div>
            <div>
              <label htmlFor="op-lodging">Hospedaje</label>
              <select
                id="op-lodging"
                value={form.lodging}
                onChange={(e) => set('lodging', e.target.value)}
              >
                <option value="included">Incluido</option>
                <option value="not_included">No incluido</option>
              </select>
            </div>

            <div>
              <label htmlFor="op-transport">Transporte</label>
              <select
                id="op-transport"
                value={form.transportation}
                onChange={(e) => set('transportation', e.target.value)}
              >
                <option value="included">Incluido</option>
                <option value="not_included">No incluido</option>
              </select>
            </div>

            <div className="form-span">
              <label htmlFor="op-desc">Descripción</label>
              <textarea
                id="op-desc"
                rows={3}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
          </div>

          <div className="form-span comp-section">
            <div className="comp-header">
              <h4>Competencias requeridas</h4>
              <button type="button" className="btn btn-sm btn-ghost" onClick={addCompRow}>
                + Añadir competencia
              </button>
            </div>
            {compRows.length === 0 && (
              <p className="muted small">
                Sin competencias: la oportunidad no podrá publicarse. Añade al menos una.
              </p>
            )}
            {compRows.map((row, index) => {
              const used = new Set(
                compRows.filter((_, i) => i !== index).map((r) => r.competency_id),
              )
              return (
                <div key={index} className="form-row comp-row">
                  <select
                    aria-label="Competencia requerida"
                    value={row.competency_id}
                    onChange={(e) =>
                      updateCompRow(index, { competency_id: Number(e.target.value) })
                    }
                  >
                    {competencies.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        disabled={used.has(c.id) && row.competency_id !== c.id}
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Nivel requerido"
                    value={row.required_level}
                    onChange={(e) => updateCompRow(index, { required_level: e.target.value })}
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger-ghost"
                    onClick={() => removeCompRow(index)}
                  >
                    Quitar
                  </button>
                </div>
              )
            })}
          </div>

          {formError && <div className="alert alert-error">{formError}</div>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear borrador'}
            </button>
            <Link to="/opportunities" className="btn btn-ghost">
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  )
}
