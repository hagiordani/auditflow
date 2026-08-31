import { useEffect, useState, type FormEvent } from 'react'
import { createCompetency, fetchCompetencies, updateCompetency } from '../../api/competencies'
import { getErrorMessage } from '../../api/client'
import type { Competency } from '../../api/types'

export function CompetenciesPage() {
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetchCompetencies()
      .then(setCompetencies)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      const created = await createCompetency({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setCompetencies((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setDescription('')
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (competency: Competency) => {
    try {
      const updated = await updateCompetency(competency.id, { is_active: !competency.is_active })
      setCompetencies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div>
      <h2 className="page-title">Competencias y especialidades</h2>
      <p className="page-subtitle">
        Catálogo de normas y especialidades que se pueden exigir en una auditoría
        (ISO 9001, ISO 14001, ISO 45001…).
      </p>

      <div className="grid grid-2col">
        <section className="card">
          <h3>Nueva competencia</h3>
          <form onSubmit={handleCreate} className="form">
            <label htmlFor="comp-name">Nombre</label>
            <input
              id="comp-name"
              required
              minLength={2}
              maxLength={120}
              placeholder="ISO 9001"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <label htmlFor="comp-desc">Descripción (opcional)</label>
            <input
              id="comp-desc"
              placeholder="Sistema de gestión de calidad"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {formError && <div className="alert alert-error">{formError}</div>}

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando…' : 'Crear competencia'}
            </button>
          </form>
        </section>

        <section className="card">
          <h3>Catálogo ({competencies.length})</h3>
          {loading && <p className="muted">Cargando…</p>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {competencies.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td className="muted">{c.description || '—'}</td>
                      <td>
                        <span className={`badge ${c.is_active ? 'badge-valid' : 'badge-invalid'}`}>
                          {c.is_active ? 'Activa' : 'Desactivada'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => toggleActive(c)}
                        >
                          {c.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {competencies.length === 0 && (
                    <tr>
                      <td colSpan={4} className="muted">
                        Sin competencias todavía. Crea la primera (p. ej. ISO 9001).
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
