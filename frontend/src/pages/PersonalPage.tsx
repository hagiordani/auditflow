import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import {
  createPersonal,
  fetchAreas,
  fetchPersonalList,
  fetchRoles,
} from '../api/personal'
import type { Personal, PersonnelArea, PersonRole } from '../api/types'
import { PersonalForm } from '../components/PersonalForm'

export function PersonalPage() {
  const [people, setPeople] = useState<Personal[]>([])
  const [roles, setRoles] = useState<PersonRole[]>([])
  const [areas, setAreas] = useState<PersonnelArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([fetchPersonalList(), fetchRoles(), fetchAreas()])
      .then(([p, r, a]) => {
        setPeople(p)
        setRoles(r)
        setAreas(a)
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  return (
    <div>
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Personal técnico</h2>
          <p className="page-subtitle">
            Catálogo del personal (evaluadores, instructores, inspectores, examinadores) con sus
            puestos, áreas y correos.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Nueva persona
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2col">
        {showForm ? (
          <section className="card">
            <h3>Nueva persona</h3>
            <PersonalForm
              roles={roles}
              areas={areas}
              submitLabel="Crear persona"
              onSubmit={async (input) => {
                await createPersonal(input)
                setShowForm(false)
                load()
              }}
              onCancel={() => setShowForm(false)}
            />
          </section>
        ) : (
          <section className="card">
            <h3>Resumen</h3>
            <div className="metric-row">
              <div>
                <p className="stat">{people.length}</p>
                <p className="muted small">Personas registradas</p>
              </div>
              <div>
                <p className="stat">{roles.length}</p>
                <p className="muted small">Roles</p>
              </div>
            </div>
          </section>
        )}

        <section className="card">
          <h3>Catálogo ({people.length})</h3>
          {loading && <p className="muted">Cargando…</p>}
          {!loading && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Puestos</th>
                    <th>Áreas</th>
                    <th>Celular</th>
                    <th>Activo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/personal/${p.id}`} className="link">
                          {p.nombre_completo}
                        </Link>
                      </td>
                      <td>{p.roles.map((r) => r.nombre).join(', ') || '—'}</td>
                      <td>{p.areas.map((a) => a.codigo).join(', ') || '—'}</td>
                      <td>{p.celular || '—'}</td>
                      <td>
                        <span className={`badge ${p.activo ? 'badge-valid' : 'badge-invalid'}`}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <Link to={`/personal/${p.id}`} className="btn btn-sm btn-ghost">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {people.length === 0 && (
                    <tr>
                      <td colSpan={6} className="muted">
                        Sin personal registrado.
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
