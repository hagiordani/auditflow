import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchUsers } from '../api/auth'
import type { Role } from '../api/types'
import { useAuth } from '../context/AuthContext'

const ROLE_INFO: Record<Role, { title: string; description: string; next: string[] }> = {
  admin: {
    title: 'Administración',
    description: 'Acceso total: usuarios, catálogos y configuración de la plataforma.',
    next: ['Gestión de usuarios', 'Catálogo de competencias', 'Configuración general'],
  },
  operations: {
    title: 'Operaciones',
    description: 'Publica oportunidades de auditoría, revisa interesados y asigna auditores.',
    next: ['Publicar oportunidades', 'Revisar postulaciones', 'Asignar auditores'],
  },
  auditor: {
    title: 'Portal del auditor',
    description: 'Consulta oportunidades compatibles con tu perfil y gestiona tus servicios.',
    next: ['Oportunidades disponibles', 'Mis postulaciones', 'Mi calendario'],
  },
  supervisor: {
    title: 'Supervisión',
    description: 'Consulta servicios, indicadores y costos de la operación.',
    next: ['Indicadores y reportes', 'Servicios por estado', 'Costos de auditorías'],
  },
}

export function Dashboard() {
  const { user } = useAuth()
  const [userCount, setUserCount] = useState<number | null>(null)

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers()
        .then((users) => setUserCount(users.length))
        .catch(() => setUserCount(null))
    }
  }, [user])

  if (!user) return null
  const info = ROLE_INFO[user.role]

  return (
    <div>
      <h2 className="page-title">Hola, {user.full_name}</h2>
      <p className="page-subtitle">{info.description}</p>

      <div className="grid">
        <section className="card">
          <h3>{info.title}</h3>
          <p>Tu perfil: <strong>{user.email}</strong></p>
        </section>

        {user.role === 'admin' && (
          <section className="card">
            <h3>Usuarios registrados</h3>
            <p className="stat">{userCount === null ? '—' : userCount}</p>
            <Link to="/admin/users" className="btn btn-primary">
              Gestionar usuarios
            </Link>
          </section>
        )}

        <section className="card">
          <h3>Próximos módulos</h3>
          <ul className="plain-list">
            {info.next.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card card-wide">
        <h3>Estado del proyecto</h3>
        <p>
          Sprint 0 completado: autenticación, roles y acceso. Los módulos de auditores,
          competencias, clientes, oportunidades y postulaciones se incorporan en los
          siguientes sprints.
        </p>
      </section>
    </div>
  )
}
