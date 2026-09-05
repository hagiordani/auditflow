import { useState, type FormEvent } from 'react'
import { changePassword } from '../api/auth'
import { getErrorMessage } from '../api/client'
import { PasswordInput } from '../components/PasswordInput'

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
          <PasswordInput
            id="sec-current"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
            required
          />

          <label htmlFor="sec-next">Nueva contraseña (mín. 8 caracteres)</label>
          <PasswordInput
            id="sec-next"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <label htmlFor="sec-confirm">Confirmar nueva contraseña</label>
          <PasswordInput
            id="sec-confirm"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            minLength={8}
            required
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
