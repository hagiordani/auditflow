import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import {
  fetchAreas,
  fetchPersonal,
  fetchRoles,
  updatePersonal,
} from '../api/personal'
import type { Personal, PersonnelArea, PersonRole } from '../api/types'
import { PersonalForm } from '../components/PersonalForm'

export function PersonalDetailPage() {
  const { personalId } = useParams()
  const id = Number(personalId)
  const [person, setPerson] = useState<Personal | null>(null)
  const [roles, setRoles] = useState<PersonRole[]>([])
  const [areas, setAreas] = useState<PersonnelArea[]>([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([fetchPersonal(id), fetchRoles(), fetchAreas()])
      .then(([p, r, a]) => {
        setPerson(p)
        setRoles(r)
        setAreas(a)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!Number.isNaN(id)) load()
  }, [id])

  const toggleActive = async () => {
    if (!person) return
    try {
      const updated = await updatePersonal(person.id, { activo: !person.activo })
      setPerson(updated)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  if (loading) return <div className="page-loading">Cargando…</div>
  if (error && !person)
    return (
      <div>
        <div className="alert alert-error">{error}</div>
        <p>
          <Link to="/personal" className="link">
            ← Volver a personal
          </Link>
        </p>
      </div>
    )
  if (!person) return null

  return (
    <div>
      <p>
        <Link to="/personal" className="link">
          ← Volver a personal
        </Link>
      </p>
      <h2 className="page-title">{person.nombre_completo}</h2>
      <p className="page-subtitle">Puestos, áreas y correos de esta persona.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2col">
        <section className="card">
          <h3>Información</h3>
          <dl className="detail-list">
            <dt>Celular</dt>
            <dd>{person.celular || '—'}</dd>
            <dt>Puestos</dt>
            <dd>{person.roles.map((r) => r.nombre).join(', ') || '—'}</dd>
            <dt>Áreas</dt>
            <dd>{person.areas.map((a) => a.codigo).join(', ') || '—'}</dd>
            <dt>Estado</dt>
            <dd>
              <span className={`badge ${person.activo ? 'badge-valid' : 'badge-invalid'}`}>
                {person.activo ? 'Activo' : 'Inactivo'}
              </span>
            </dd>
          </dl>
          <h4 className="detail-sub">Correos</h4>
          <ul className="plain-list">
            {person.emails.map((e) => (
              <li key={e.id}>
                {e.email}
                {e.principal && <span className="muted small"> · principal</span>}
              </li>
            ))}
            {person.emails.length === 0 && <li className="muted">Sin correos.</li>}
          </ul>
          <div className="row-actions" style={{ marginTop: 14 }}>
            <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
              Editar
            </button>
            <button type="button" className="btn btn-ghost" onClick={toggleActive}>
              {person.activo ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        </section>

        {editing && (
          <section className="card">
            <h3>Editar persona</h3>
            <PersonalForm
              roles={roles}
              areas={areas}
              initial={person}
              submitLabel="Guardar cambios"
              onSubmit={async (input) => {
                const updated = await updatePersonal(person.id, input)
                setPerson(updated)
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          </section>
        )}
      </div>
    </div>
  )
}
