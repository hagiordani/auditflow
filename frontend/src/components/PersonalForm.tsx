import { useState, type FormEvent } from 'react'
import type { Personal, PersonnelArea, PersonRole } from '../api/types'
import type { PersonalInput } from '../api/personal'

interface Props {
  roles: PersonRole[]
  areas: PersonnelArea[]
  initial?: Personal | null
  submitLabel: string
  onSubmit: (input: PersonalInput) => Promise<void>
  onCancel?: () => void
}

export function PersonalForm({ roles, areas, initial, submitLabel, onSubmit, onCancel }: Props) {
  const [nombre, setNombre] = useState(initial?.nombre_completo ?? '')
  const [celular, setCelular] = useState(initial?.celular ?? '')
  const [rolIds, setRolIds] = useState<number[]>(initial?.roles.map((r) => r.id) ?? [])
  const [areaIds, setAreaIds] = useState<number[]>(initial?.areas.map((a) => a.id) ?? [])
  const [emails, setEmails] = useState<{ email: string; principal: boolean }[]>(
    initial?.emails.map((e) => ({ email: e.email, principal: e.principal })) ?? [],
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const toggle = (list: number[], id: number, set: (v: number[]) => void) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

  const addEmail = () => setEmails([...emails, { email: '', principal: emails.length === 0 }])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSubmit({
        nombre_completo: nombre.trim(),
        celular: celular.trim() || null,
        rol_ids: rolIds,
        area_ids: areaIds,
        emails: emails.filter((x) => x.email.trim()),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label>Nombre completo</label>
      <input required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} />

      <label>Celular</label>
      <input value={celular} onChange={(e) => setCelular(e.target.value)} />

      <div className="form-field">
        <label>Roles / puestos</label>
        <div className="check-list">
          {roles.map((r) => (
            <label key={r.id} className="checkbox-row">
              <input
                type="checkbox"
                checked={rolIds.includes(r.id)}
                onChange={() => toggle(rolIds, r.id, setRolIds)}
              />
              {r.nombre}
            </label>
          ))}
        </div>
      </div>

      <div className="form-field">
        <label>Áreas</label>
        <div className="check-list">
          {areas.map((a) => (
            <label key={a.id} className="checkbox-row">
              <input
                type="checkbox"
                checked={areaIds.includes(a.id)}
                onChange={() => toggle(areaIds, a.id, setAreaIds)}
              />
              {a.codigo} {a.nombre ? `· ${a.nombre}` : ''}
            </label>
          ))}
        </div>
      </div>

      <div className="form-field">
        <label>Correos</label>
        {emails.map((em, i) => (
          <div key={i} className="email-row">
            <input
              type="email"
              placeholder="correo@dominio.com"
              value={em.email}
              onChange={(e) => setEmails(emails.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))}
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={em.principal}
                onChange={(e) => setEmails(emails.map((x, j) => (j === i ? { ...x, principal: e.target.checked } : x)))}
              />
              Principal
            </label>
            <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => setEmails(emails.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}
        <button type="button" className="btn btn-sm btn-ghost" onClick={addEmail}>
          + Añadir correo
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="row-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
