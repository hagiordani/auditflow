import { useEffect, useState, type FormEvent } from 'react'
import { createUser, fetchUsers, updateUser } from '../../api/auth'
import { getErrorMessage } from '../../api/client'
import type { Role, User } from '../../api/types'
import { useAuth } from '../../context/AuthContext'

const ROLES: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'auditor', label: 'Auditor' },
]

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  operations: 'Administrador',
  auditor: 'Auditor',
  supervisor: 'Administrador',
}

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'auditor' as Role }

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetchUsers()
      .then(setUsers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const toggleActive = async (user: User) => {
    setError('')
    try {
      const updated = await updateUser(user.id, { is_active: !user.is_active })
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const changeRole = async (user: User) => {
    setError('')
    const isAdminLike = user.role === 'admin' || user.role === 'operations' || user.role === 'supervisor'
    const newRole: Role = isAdminLike ? 'auditor' : 'admin'
    try {
      const updated = await updateUser(user.id, { role: newRole })
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    try {
      await createUser({ ...form, email: form.email.trim(), full_name: form.full_name.trim() })
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="page-title">Usuarios</h2>
      <p className="page-subtitle">Cuentas de acceso: Administrador o Auditor. Puedes cambiar el rol de cada cuenta.</p>
      <div className="alert alert-info">
        Los <strong>auditores</strong> normalmente se crean en <strong>Auditores</strong> (genera su
        cuenta + perfil). Si una cuenta quedó con rol incorrecto, usa <strong>Cambiar rol</strong>.
      </div>

      <div className="grid grid-2col">
        <section className="card">
          <h3>Nuevo usuario</h3>
          <form onSubmit={handleSubmit} className="form">
            <label htmlFor="full_name">Nombre completo</label>
            <input
              id="full_name"
              required
              minLength={2}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />

            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <label htmlFor="password">Contraseña (mín. 8 caracteres)</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <label htmlFor="role">Rol</label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {formError && <div className="alert alert-error">{formError}</div>}

            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creando…' : 'Crear usuario'}
            </button>
          </form>
        </section>

        <section className="card">
          <h3>Usuarios registrados ({users.length})</h3>
          {loading && <p className="muted">Cargando…</p>}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && (
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge badge-${u.role}`}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          disabled={u.id === currentUser?.id}
                          title={
                            u.id === currentUser?.id
                              ? 'No puedes cambiar tu propio rol'
                              : undefined
                          }
                          onClick={() => changeRole(u)}
                        >
                          Cambiar rol
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          disabled={u.id === currentUser?.id}
                          title={
                            u.id === currentUser?.id
                              ? 'No puedes desactivar tu propia cuenta'
                              : undefined
                          }
                          onClick={() => toggleActive(u)}
                        >
                          {u.is_active ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted">
                      Sin usuarios todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
