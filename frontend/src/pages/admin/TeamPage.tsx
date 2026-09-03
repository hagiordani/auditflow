import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { createUser, fetchUsers, updateUser } from '../../api/auth'
import { createAuditor, fetchAuditors, updateAuditor } from '../../api/auditors'
import { getErrorMessage } from '../../api/client'
import type { Auditor, Role, User } from '../../api/types'
import { formatMoney } from '../../utils/format'
import { useAuth } from '../../context/AuthContext'
import { EmptyState } from '../../components/dashboard/EmptyState'

type Catalog = 'auditores' | 'admin'
type ViewMode = 'list' | 'grid'
const TYPE_LABELS: Record<string, string> = { interno: 'Interno', externo: 'Externo' }
const ROLE_CATALOG = ['Evaluador', 'Evaluador e Instructor', 'Evaluador, Instructor y Examinador', 'Inspector', 'Instructor']
const AVAIL_LABELS: Record<string, { label: string; tone: string }> = {
  available: { label: 'Disponible', tone: 'ok' },
  busy: { label: 'En operación', tone: 'warn' },
  unavailable: { label: 'No disponible', tone: 'err' },
}

interface Row {
  id: number
  full_name: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
  auditor: Auditor | null
}
interface Filters {
  tipo?: string
  rol?: string
  state?: string
  availability?: string
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || 'AF'
}
function timeAgo(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function TeamPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [auditors, setAuditors] = useState<Auditor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [catalog, setCatalog] = useState<Catalog>('auditores')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [addMember, setAddMember] = useState(false)
  const [toast, setToast] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    Promise.all([fetchUsers(), fetchAuditors()])
      .then(([u, a]) => { setUsers(u); setAuditors(a); setLoading(false) })
      .catch((err) => { setError(getErrorMessage(err)); setLoading(false) })
  }
  useEffect(load, [])

  const byUserId = useMemo(() => new Map(auditors.map((a) => [a.user_id, a])), [auditors])
  const rows: Row[] = useMemo(() => users.map((u) => ({ ...u, auditor: byUserId.get(u.id) ?? null })), [users, byUserId])
  const isAuditor = (r: Row) => r.role === 'auditor'
  const isAdmin = (r: Row) => ['admin', 'operations', 'supervisor'].includes(r.role)
  const base = catalog === 'auditores' ? rows.filter(isAuditor) : rows.filter(isAdmin)

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return base.filter((r) => {
      const hay = `${r.full_name} ${r.email} ${r.auditor?.specialty ?? ''} ${r.auditor?.city ?? ''} ${r.auditor?.state ?? ''}`.toLowerCase()
      if (term && !hay.includes(term)) return false
      if (filters.tipo && r.auditor?.auditor_type !== filters.tipo) return false
      if (filters.rol && !(r.auditor?.roles ?? '').toLowerCase().includes(filters.rol.toLowerCase())) return false
      if (filters.state && r.auditor?.state !== filters.state) return false
      if (filters.availability && r.auditor?.availability_status !== filters.availability) return false
      return true
    })
  }, [base, q, filters])

  const complete = (r: Row) => (r.auditor ? !!(r.auditor.specialty || r.auditor.city || (r.auditor.roles ?? '').trim()) : true)
  const auditorsList = rows.filter(isAuditor)
  const kpis = [
    { label: 'Auditores', value: auditorsList.length, sub: 'registrados' },
    { label: 'Disponibles', value: auditorsList.filter((r) => r.auditor?.availability_status === 'available').length, sub: 'para asignar' },
    { label: 'En operación', value: auditorsList.filter((r) => r.auditor?.availability_status === 'busy').length, sub: 'actualmente' },
    { label: 'No disponibles', value: auditorsList.filter((r) => r.auditor?.availability_status === 'unavailable').length, sub: 'bloqueados' },
    { label: 'Info. pendiente', value: auditorsList.filter((r) => !complete(r)).length, sub: 'perfil incompleto' },
  ]
  const adminList = rows.filter(isAdmin)
  const adminKpis = [
    { label: 'Administradores', value: adminList.length, sub: 'registrados' },
    { label: 'Activos', value: adminList.filter((r) => r.is_active).length, sub: 'con acceso' },
    { label: 'Inactivos', value: adminList.filter((r) => !r.is_active).length, sub: 'sin acceso' },
  ]

  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const drawerRow = rows.find((r) => r.id === drawerId) ?? null

  const toggleActive = async (u: { id: number; is_active: boolean }) => {
    setError('')
    try { const up = await updateUser(u.id, { is_active: !u.is_active }); setUsers((prev) => prev.map((x) => (x.id === up.id ? up : x))) } catch (err) { setError(getErrorMessage(err)) }
  }
  const activeFilters = Object.values(filters).filter(Boolean).length
  const chips: { key: string; label: string }[] = []
  if (filters.tipo) chips.push({ key: 'tipo', label: TYPE_LABELS[filters.tipo] ?? filters.tipo })
  if (filters.rol) chips.push({ key: 'rol', label: `Rol: ${filters.rol}` })
  if (filters.state) chips.push({ key: 'state', label: filters.state })
  if (filters.availability) chips.push({ key: 'availability', label: AVAIL_LABELS[filters.availability]?.label ?? filters.availability })

  const switchCatalog = (c: Catalog) => { setCatalog(c); setPage(1); setQ(''); setFilters({}); setMenuFor(null); setDrawerId(null) }

  return (
    <div className="tm">
      <header className="tm-header">
        <div>
          <h2 className="oi-title">Equipo</h2>
          <p className="oi-subtitle">Administra las cuentas y perfiles de las personas que operan AuditFlow.</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setAddMember(true)}>+ Agregar miembro</button>
      </header>

      <div className="tm-catsel" role="tablist" aria-label="Seleccionar catálogo">
        <button type="button" role="tab" aria-selected={catalog === 'auditores'} className={`tm-catsel-panel ${catalog === 'auditores' ? 'active' : ''}`} onClick={() => switchCatalog('auditores')}>
          <span className="tm-catsel-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
          </span>
          <span className="tm-catsel-main">
            <span className="tm-catsel-title">Auditores<span className="tm-catsel-count">{auditorsList.length}</span></span>
            <span className="tm-catsel-sub">Catálogo profesional</span>
            <span className="tm-catsel-desc">Perfiles, competencias y disponibilidad</span>
          </span>
          <span className="tm-catsel-arrow" aria-hidden="true">→</span>
        </button>

        <button type="button" role="tab" aria-selected={catalog === 'admin'} className={`tm-catsel-panel ${catalog === 'admin' ? 'active' : ''}`} onClick={() => switchCatalog('admin')}>
          <span className="tm-catsel-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.4 3 8.4 7 10 4-1.6 7-5.6 7-10V6Z" /><path d="m9.5 12 1.8 1.8L14.5 10" /></svg>
          </span>
          <span className="tm-catsel-main">
            <span className="tm-catsel-title">Administradores<span className="tm-catsel-count">{adminList.length}</span></span>
            <span className="tm-catsel-sub">Catálogo de acceso</span>
            <span className="tm-catsel-desc">Cuentas, permisos y acceso</span>
          </span>
          <span className="tm-catsel-arrow" aria-hidden="true">→</span>
        </button>
      </div>

      {catalog === 'auditores' ? (
        <>
          <div className="tm-catalog-head">
            <h3 className="oi-title">Auditores</h3>
            <p className="oi-subtitle">Gestiona los auditores registrados y su perfil profesional.</p>
          </div>

          <div className="ok-kpis">
            {kpis.map((k) => <div className="ok-kpi" key={k.label}><span className="ok-kpi-value">{k.value}</span><span className="ok-kpi-label">{k.label}</span><span className="ok-kpi-sub">{k.sub}</span></div>)}
          </div>

          <div className="tm-toolbar">
            <input className="mk-search" placeholder="Buscar auditor por nombre, correo, ciudad, cargo…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
            <button type="button" className={`mk-chip mk-chip-btn ${activeFilters > 0 ? 'active' : ''}`} onClick={() => setShowFilters(true)}>{activeFilters > 0 ? `Filtros (${activeFilters})` : 'Filtros'}</button>
            <div className="mk-switch" role="tablist"><button type="button" className={`mk-switch-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>Lista</button><button type="button" className={`mk-switch-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Tarjetas</button></div>
          </div>

          {chips.length > 0 && <div className="mk-activechips">{chips.map((c) => <button key={c.key} type="button" className="mk-chip active" onClick={() => setFilters((f) => ({ ...f, [c.key]: undefined }))}>{c.label} ×</button>)}<button type="button" className="mk-chip mk-chip-btn" onClick={() => setFilters({})}>Limpiar filtros</button></div>}

          {error && <div className="alert alert-error">{error}</div>}
          {loading ? <SkeletonRows /> : filtered.length === 0 ? <EmptyState icon="◌" title="Sin auditores" description="No hay auditores que coincidan con la búsqueda o filtros." /> : viewMode === 'list' ? (
            <AuditorTable rows={pageRows} menuFor={menuFor} setMenuFor={setMenuFor} onOpen={(r) => setDrawerId(r.id)} onToggle={toggleActive} />
          ) : (
            <AuditorGrid rows={pageRows} onOpen={(r) => setDrawerId(r.id)} />
          )}

          {filtered.length > 0 && <Pagination page={page} pageCount={pageCount} from={(page - 1) * pageSize + 1} to={Math.min(page * pageSize, filtered.length)} total={filtered.length} setPage={setPage} />}

          {drawerRow && drawerRow.auditor && <AuditorDrawer row={drawerRow} currentUserId={currentUser?.id} onClose={() => setDrawerId(null)} onToggle={toggleActive} onSaved={() => load()} onToast={setToast} />}
          {showFilters && <AuditorFiltersDrawer filters={filters} setFilters={setFilters} auditors={auditors} onClose={() => setShowFilters(false)} />}
        </>
      ) : (
        <>
          <div className="tm-catalog-head">
            <h3 className="oi-title">Administradores</h3>
            <p className="oi-subtitle">Gestiona las cuentas con acceso administrativo a AuditFlow.</p>
          </div>

          <div className="ok-kpis">
            {adminKpis.map((k) => <div className="ok-kpi" key={k.label}><span className="ok-kpi-value">{k.value}</span><span className="ok-kpi-label">{k.label}</span><span className="ok-kpi-sub">{k.sub}</span></div>)}
          </div>

          <div className="tm-toolbar">
            <input className="mk-search" placeholder="Buscar administrador por nombre o correo…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
            <div className="mk-switch" role="tablist"><button type="button" className={`mk-switch-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>Lista</button><button type="button" className={`mk-switch-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Tarjetas</button></div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {loading ? <SkeletonRows /> : filtered.length === 0 ? <EmptyState icon="◌" title="Sin administradores" description="No hay administradores que coincidan." /> : viewMode === 'list' ? (
            <AdminTable rows={pageRows} onOpen={(r) => setDrawerId(r.id)} onToggle={toggleActive} />
          ) : (
            <AdminGrid rows={pageRows} onOpen={(r) => setDrawerId(r.id)} />
          )}

          {filtered.length > 0 && <Pagination page={page} pageCount={pageCount} from={(page - 1) * pageSize + 1} to={Math.min(page * pageSize, filtered.length)} total={filtered.length} setPage={setPage} />}

          {drawerRow && !drawerRow.auditor && <AdminDrawer row={drawerRow} currentUserId={currentUser?.id} onClose={() => setDrawerId(null)} onToggle={toggleActive} />}
        </>
      )}
      {addMember && <AddMemberWizard onClose={() => setAddMember(false)} onDone={() => { setAddMember(false); load(); setToast('✓ Miembro creado') }} />}

      {toast && <div className="mk-toast">{toast}</div>}
    </div>
  )
}

function SkeletonRows() {
  return <div className="tm-list">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="oi-skeleton" style={{ height: 58, width: '100%' }} />)}</div>
}
function Pagination({ page, pageCount, from, to, total, setPage }: { page: number; pageCount: number; from: number; to: number; total: number; setPage: (p: number) => void }) {
  return (
    <div className="mk-pagination">
      <span className="muted">Mostrando {from}–{to} de {total}</span>
      <div className="mk-pages">
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>←</button>
        {Array.from({ length: pageCount }).map((_, i) => <button key={i} type="button" className={page === i + 1 ? 'active' : ''} onClick={() => setPage(i + 1)}>{i + 1}</button>)}
        <button type="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>→</button>
      </div>
    </div>
  )
}

function AuditorTable({ rows, menuFor, setMenuFor, onOpen, onToggle }: { rows: Row[]; menuFor: number | null; setMenuFor: (n: number | null) => void; onOpen: (r: Row) => void; onToggle: (u: { id: number; is_active: boolean }) => void }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Auditor</th><th>Tipo</th><th>Cargo / Especialidad</th><th>Roles</th><th>Ubicación</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => {
            const a = r.auditor!
            return (
              <tr key={r.id} className="tm-row" onClick={() => onOpen(r)}>
                <td><div className="oi-user-cell"><span className="oi-avatar">{initials(r.full_name)}</span><span><strong>{r.full_name}</strong><div className="muted small">{r.email}</div></span></div></td>
                <td><span className="badge badge-primary">{TYPE_LABELS[a.auditor_type]}</span></td>
                <td>{a.specialty ?? '—'}</td>
                <td>{a.roles ? <span className="oi-cred-badge">{a.roles.split(';')[0]}</span> : '—'}</td>
                <td>{[a.city, a.state].filter(Boolean).join(', ') || '—'}</td>
                <td>{a.phone ?? '—'}</td>
                <td><span className={`badge ${r.is_active ? 'badge-active' : 'badge-inactive'}`}>{r.is_active ? 'Activo' : 'Inactivo'}</span></td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="tm-kebab" aria-label="Opciones" onClick={() => setMenuFor(menuFor === r.id ? null : r.id)}>⋮</button>
                  {menuFor === r.id && (
                    <div className="tm-menu">
                      <button type="button" onClick={() => { setMenuFor(null); onOpen(r) }}>Ver perfil</button>
                      <button type="button" onClick={() => { setMenuFor(null); onOpen(r) }}>Editar perfil</button>
                      <button type="button" onClick={() => { setMenuFor(null); onOpen(r) }}>Ver competencias</button>
                      <Link to="/calendar" onClick={() => setMenuFor(null)}>Ver agenda</Link>
                      <Link to="/auditor/opportunities" onClick={() => setMenuFor(null)}>Oportunidades compatibles</Link>
                      <button type="button" onClick={() => { setMenuFor(null); onToggle(r) }}>{r.is_active ? 'Desactivar' : 'Activar'}</button>
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function AuditorGrid({ rows, onOpen }: { rows: Row[]; onOpen: (r: Row) => void }) {
  return (
    <div className="mk-grid-cards">
      {rows.map((r) => { const a = r.auditor!; return (
        <article key={r.id} className="mk-card-g" onClick={() => onOpen(r)}>
          <div className="mk-card-top"><span className="oi-avatar">{initials(r.full_name)}</span><span className="mk-badge">{TYPE_LABELS[a.auditor_type]}</span></div>
          <h3 className="mk-card-title">{r.full_name}</h3>
          <div className="muted small">{r.email}</div>
          {a.phone && <div className="muted small">☎ {a.phone}</div>}
          <div className="mk-card-meta"><span>📍 {[a.city, a.state].filter(Boolean).join(', ') || '—'}</span><span>🧾 {a.specialty ?? '—'}</span></div>
          <div className="mk-row-norms">{a.roles ? <span className="mk-norm">{a.roles.split(';')[0]}</span> : null}</div>
          <div className="mk-card-foot"><span className={`badge ${r.is_active ? 'badge-active' : 'badge-inactive'}`}>{r.is_active ? 'Activo' : 'Inactivo'}</span></div>
        </article>
      ) })}
    </div>
  )
}

function AdminTable({ rows, onOpen, onToggle }: { rows: Row[]; onOpen: (r: Row) => void; onToggle: (u: { id: number; is_active: boolean }) => void }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Administrador</th><th>Rol</th><th>Estado</th><th>Fecha de alta</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="tm-row" onClick={() => onOpen(r)}>
              <td><div className="oi-user-cell"><span className="oi-avatar">{initials(r.full_name)}</span><span><strong>{r.full_name}</strong><div className="muted small">{r.email}</div></span></div></td>
              <td><span className="badge badge-primary">Administrador</span></td>
              <td><span className={`badge ${r.is_active ? 'badge-active' : 'badge-inactive'}`}>{r.is_active ? 'Activo' : 'Inactivo'}</span></td>
              <td>{timeAgo(r.created_at)}</td>
              <td onClick={(e) => e.stopPropagation()}><button type="button" className="btn btn-sm btn-ghost" onClick={() => onToggle(r)}>{r.is_active ? 'Desactivar' : 'Activar'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
function AdminGrid({ rows, onOpen }: { rows: Row[]; onOpen: (r: Row) => void }) {
  return <div className="mk-grid-cards">{rows.map((r) => <article key={r.id} className="mk-card-g" onClick={() => onOpen(r)}><div className="mk-card-top"><span className="oi-avatar">{initials(r.full_name)}</span><span className={`badge ${r.is_active ? 'badge-active' : 'badge-inactive'}`}>{r.is_active ? 'Activo' : 'Inactivo'}</span></div><h3 className="mk-card-title">{r.full_name}</h3><div className="muted small">{r.email}</div><div className="mk-badge">Administrador</div></article>)}</div>
}

function AuditorDrawer({ row, currentUserId, onClose, onToggle, onSaved, onToast }: { row: Row; currentUserId?: number; onClose: () => void; onToggle: (u: { id: number; is_active: boolean }) => void; onSaved: () => void; onToast: (m: string) => void }) {
  const a = row.auditor!
  const [tab, setTab] = useState<'perfil' | 'competencias'>('perfil')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ city: a.city ?? '', state: a.state ?? '', specialty: a.specialty ?? '', daily_rate: String(a.daily_rate ?? ''), auditor_type: a.auditor_type, roles: a.roles ?? '', phone: a.phone ?? '' })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true); setErr('')
    try { await updateAuditor(a.id, { city: draft.city.trim() || null, state: draft.state.trim() || null, specialty: draft.specialty.trim() || null, daily_rate: draft.daily_rate ? Number(draft.daily_rate) : null, auditor_type: draft.auditor_type, roles: draft.roles.trim() || null, phone: draft.phone.trim() || null }); setEditing(false); onSaved(); onToast('✓ Perfil actualizado') } catch (e) { setErr(getErrorMessage(e)) } finally { setSaving(false) }
  }
  return (
    <div className="mk-drawer-overlay" onClick={onClose}>
      <div className="mk-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Detalle de auditor">
        <div className="mk-drawer-head"><div className="oi-user-cell"><span className="oi-avatar">{initials(row.full_name)}</span><div><strong>{row.full_name}</strong><div className="muted small">{row.email}</div></div></div><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="mk-drawer-status" style={{ color: '#16a34a' }}>● {TYPE_LABELS[a.auditor_type]} · {a.specialty ?? 'Sin cargo'}</div>
        <div className="mk-detail-tabs" role="tablist"><button type="button" className={tab === 'perfil' ? 'active' : ''} onClick={() => setTab('perfil')}>Perfil</button><button type="button" className={tab === 'competencias' ? 'active' : ''} onClick={() => setTab('competencias')}>Competencias</button></div>

        {editing ? (
          <div className="form">
            <div className="form-row"><div><label>Ciudad</label><input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></div><div><label>Estado</label><input value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} /></div></div>
            <label>Teléfono</label><input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+52 000 000 0000" />
            <label>Cargo / Especialidad</label><input value={draft.specialty} onChange={(e) => setDraft({ ...draft, specialty: e.target.value })} />
            <label>Roles (';')</label><input value={draft.roles} onChange={(e) => setDraft({ ...draft, roles: e.target.value })} />
            <div className="form-row"><div><label>Tipo</label><select value={draft.auditor_type} onChange={(e) => setDraft({ ...draft, auditor_type: e.target.value })}><option value="externo">Externo</option><option value="interno">Interno</option></select></div><div><label>Tarifa</label><input type="number" value={draft.daily_rate} onChange={(e) => setDraft({ ...draft, daily_rate: e.target.value })} /></div></div>
            {err && <div className="alert alert-error">{err}</div>}
            <div className="row-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancelar</button><button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
          </div>
        ) : (
          <>
            {tab === 'perfil' && (
              <dl className="oc-drawer-rows">
                <div className="oc-drawer-row"><dt>Correo</dt><dd>{row.email}</dd></div>
                <div className="oc-drawer-row"><dt>Teléfono</dt><dd>{a.phone ?? '—'}</dd></div>
                <div className="oc-drawer-row"><dt>Ciudad</dt><dd>{a.city ?? '—'}</dd></div>
                <div className="oc-drawer-row"><dt>Estado</dt><dd>{a.state ?? '—'}</dd></div>
                <div className="oc-drawer-row"><dt>Tipo</dt><dd>{TYPE_LABELS[a.auditor_type]}</dd></div>
                <div className="oc-drawer-row"><dt>Cargo / Especialidad</dt><dd>{a.specialty ?? '—'}</dd></div>
                <div className="oc-drawer-row"><dt>Tarifa diaria</dt><dd>{formatMoney(a.daily_rate)}</dd></div>
                <div className="oc-drawer-row"><dt>Roles</dt><dd>{a.roles ? a.roles.replace(/;/g, ', ') : '—'}</dd></div>
                <div className="oc-drawer-row"><dt>Disponibilidad</dt><dd>{AVAIL_LABELS[a.availability_status]?.label ?? '—'}</dd></div>
                <div className="oc-drawer-row"><dt>Fecha de alta</dt><dd>{timeAgo(row.created_at)}</dd></div>
              </dl>
            )}
            {tab === 'competencias' && (
              <div className="tm-certs">
                {a.competencies.length === 0 ? <span className="muted">Sin competencias asignadas.</span> : a.competencies.map((c) => <div key={c.id} className="tm-cert"><strong>{c.competency.name} · {c.level}</strong><span className={c.is_valid ? 'ok-avail-ok' : 'ok-avail-err'}>{c.is_valid ? '● Vigente' : '● Vencida'}</span></div>)}
              </div>
            )}
            <div className="mk-detail-actions">
              <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>Editar perfil</button>
              <button type="button" className="btn btn-ghost" disabled={row.id === currentUserId} onClick={() => onToggle(row)}>{row.is_active ? 'Desactivar' : 'Activar'}</button>
              <Link to="/calendar" className="btn btn-ghost">Ver agenda</Link>
              <Link to="/auditor/opportunities" className="btn btn-ghost">Oportunidades</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AdminDrawer({ row, currentUserId, onClose, onToggle }: { row: Row; currentUserId?: number; onClose: () => void; onToggle: (u: { id: number; is_active: boolean }) => void }) {
  return (
    <div className="mk-drawer-overlay" onClick={onClose}>
      <div className="mk-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Detalle de administrador">
        <div className="mk-drawer-head"><div className="oi-user-cell"><span className="oi-avatar">{initials(row.full_name)}</span><div><strong>{row.full_name}</strong><div className="muted small">{row.email}</div></div></div><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="mk-drawer-status" style={{ color: '#145da0' }}>● Administrador</div>
        <dl className="oc-drawer-rows">
          <div className="oc-drawer-row"><dt>Correo</dt><dd>{row.email}</dd></div>
          <div className="oc-drawer-row"><dt>Rol</dt><dd>Administrador</dd></div>
          <div className="oc-drawer-row"><dt>Estado</dt><dd>{row.is_active ? 'Activo' : 'Inactivo'}</dd></div>
          <div className="oc-drawer-row"><dt>Fecha de alta</dt><dd>{timeAgo(row.created_at)}</dd></div>
        </dl>
        <div className="mk-detail-actions"><button type="button" className="btn btn-ghost" disabled={row.id === currentUserId} onClick={() => onToggle(row)}>{row.is_active ? 'Desactivar' : 'Activar'}</button></div>
      </div>
    </div>
  )
}

function AddMemberWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<'auditor' | 'admin' | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', auditor_type: 'externo', specialty: '', city: '', state: '', roles: '' })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const choose = (t: 'auditor' | 'admin') => { setType(t) }

  const submit = async () => {
    setSaving(true); setErr('')
    try {
      if (type === 'admin') {
        await createUser({ email: form.email.trim(), full_name: form.full_name.trim(), password: form.password, role: 'admin' })
      } else {
        await createAuditor({ email: form.email.trim(), full_name: form.full_name.trim(), password: form.password, phone: form.phone.trim() || null, auditor_type: form.auditor_type, specialty: form.specialty.trim() || null, roles: form.roles || null, city: form.city.trim() || null, state: form.state.trim() || null })
      }
      onDone()
    } catch (e) { setErr(getErrorMessage(e)) } finally { setSaving(false) }
  }

  return (
    <div className="mk-modal-overlay" onClick={onClose}>
      <div className="mk-modal tm-addmodal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Agregar miembro">
        <div className="mk-drawer-head"><h3 className="oi-panel-title">Agregar miembro</h3><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>

        {type === null ? (
          <>
            <div className="tm-step"><strong>Paso 1 de 2</strong><span>Selecciona el tipo de miembro</span></div>
            <div className="tm-tip">Elige qué tipo de cuenta vas a crear. Puedes cambiar de tipo antes del siguiente paso.</div>
            <div className="tm-typeselect">
              <button type="button" className="tm-typecard" onClick={() => choose('auditor')}>
                <span className="tm-typecard-icon">👤</span>
                <span className="tm-typecard-text"><strong>Auditor</strong><em>Cuenta de acceso + perfil profesional</em></span>
                <span className="tm-typecard-arrow">→</span>
              </button>
              <button type="button" className="tm-typecard" onClick={() => choose('admin')}>
                <span className="tm-typecard-icon">🛡</span>
                <span className="tm-typecard-text"><strong>Administrador</strong><em>Solo cuenta de acceso</em></span>
                <span className="tm-typecard-arrow">→</span>
              </button>
            </div>
            <div className="row-actions"><button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button></div>
          </>
        ) : (
          <>
            <div className="tm-step"><strong>Paso 2 de 2</strong><span>{type === 'admin' ? 'Datos de acceso' : 'Datos de acceso y perfil'}</span></div>
            <form className="form">
              <label>Nombre completo</label><input required minLength={2} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              <label>Correo electrónico</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <label>Contraseña (mín. 8)</label><input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />

              {type === 'auditor' && <>
                <div className="form-row"><div><label>Tipo</label><select value={form.auditor_type} onChange={(e) => setForm({ ...form, auditor_type: e.target.value })}><option value="externo">Externo</option><option value="interno">Interno</option></select></div><div><label>Teléfono</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+52 000 000 0000" /></div></div>
                <label>Cargo / Especialidad</label><input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                <div className="form-row"><div><label>Ciudad</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div><div><label>Estado</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div></div>
                <label>Roles</label><select value={form.roles} onChange={(e) => setForm({ ...form, roles: e.target.value })}><option value="">Selecciona un rol…</option>{ROLE_CATALOG.map((r) => <option key={r} value={r}>{r}</option>)}</select>
              </>}

              {err && <div className="alert alert-error">{err}</div>}
              <div className="row-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setType(null)}>← Tipo</button>
                <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Creando…' : 'Crear miembro'}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function AuditorFiltersDrawer({ filters, setFilters, auditors, onClose }: { filters: Filters; setFilters: (f: Filters) => void; auditors: Auditor[]; onClose: () => void }) {
  const states = [...new Set(auditors.map((a) => a.state).filter((s): s is string => !!s))].sort()
  const rolOpts = [...new Set(auditors.flatMap((a) => (a.roles ?? '').split(/[;,]/).map((s) => s.trim()).filter(Boolean)))].sort()
  const set = (k: keyof Filters, v: string) => setFilters({ ...filters, [k]: v || undefined })
  return (
    <div className="mk-modal-overlay" onClick={onClose}>
      <div className="mk-drawer mk-adv" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Filtros de auditores">
        <div className="mk-drawer-head"><h3 className="oi-panel-title">Filtros de auditores</h3><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="mk-adv-section"><span className="mk-section-label">Tipo</span><select className="mk-adv-select" value={filters.tipo ?? ''} onChange={(e) => set('tipo', e.target.value)}><option value="">Todos</option><option value="externo">Externo</option><option value="interno">Interno</option></select></div>
        <div className="mk-adv-section"><span className="mk-section-label">Rol</span><select className="mk-adv-select" value={filters.rol ?? ''} onChange={(e) => set('rol', e.target.value)}><option value="">Todos</option>{rolOpts.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
        <div className="mk-adv-section"><span className="mk-section-label">Ubicación</span><select className="mk-adv-select" value={filters.state ?? ''} onChange={(e) => set('state', e.target.value)}><option value="">Todas</option>{states.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="mk-adv-section"><span className="mk-section-label">Disponibilidad</span><select className="mk-adv-select" value={filters.availability ?? ''} onChange={(e) => set('availability', e.target.value)}><option value="">Todas</option><option value="available">Disponible</option><option value="busy">En operación</option><option value="unavailable">No disponible</option></select></div>
        <div className="mk-adv-footer"><button type="button" className="btn btn-ghost" onClick={() => setFilters({})}>Limpiar</button><button type="button" className="btn btn-primary" onClick={onClose}>Aplicar filtros</button></div>
      </div>
    </div>
  )
}
