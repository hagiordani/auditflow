import { useState, type FormEvent } from 'react'
import { changePassword } from '../api/auth'
import { getErrorMessage } from '../api/client'

export function SecurityPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (next !== confirm) {
      setError('La confirmación no coincide con la nueva contraseña.')
      return
    }
    setSaving(true)
    try {
      await changePassword(current, next)
      setSuccess('Contraseña actualizada correctamente.')
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="page-title">Seguridad</h2>
      <p className="page-subtitle">Actualiza la contraseña de tu cuenta.</p>

      <section className="card narrow-card">
        <h3>Cambiar contraseña</h3>
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="sec-current">Contraseña actual</label>
          <input
            id="sec-current"
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />

          <label htmlFor="sec-next">Nueva contraseña (mín. 8 caracteres)</label>
          <input
            id="sec-next"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />

          <label htmlFor="sec-confirm">Confirmar nueva contraseña</label>
          <input
            id="sec-confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </form>
      </section>
    </div>
  )
}
