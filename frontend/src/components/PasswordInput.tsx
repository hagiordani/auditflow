import { useState } from 'react'

interface PasswordInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  placeholder?: string
  minLength?: number
  required?: boolean
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  minLength,
  required,
}: PasswordInputProps) {
  const [show, setShow] = useState(false)
  return (
    <div className="password-wrap">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        title={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
          {show && <line x1="3" y1="3" x2="21" y2="21" />}
        </svg>
      </button>
    </div>
  )
}
