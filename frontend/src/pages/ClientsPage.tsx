import { useEffect, useMemo, useState } from 'react'
import { createClient, fetchClients, updateClient } from '../api/clients'
import { getErrorMessage } from '../api/client'
import type { Client } from '../api/types'
import { EmptyState } from '../components/dashboard/EmptyState'

type ViewMode = 'list' | 'grid'

interface Filters {
  state?: string
  contact?: string
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || 'CL'
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<Filters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    fetchClients()
      .then(setClients)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return clients.filter((c) => {
      const hay = `${c.business_name} ${c.commercial_name ?? ''} ${c.tax_id ?? ''} ${c.city ?? ''} ${c.state ?? ''} ${c.contact_name ?? ''} ${c.contact_email ?? ''}`.toLowerCase()
      if (term && !hay.includes(term)) return false
      if (filters.state && c.state !== filters.state) return false
      const hasContact = !!(c.contact_name || c.contact_email || c.contact_phone)
      if (filters.contact === 'has' && !hasContact) return false
      if (filters.contact === 'none' && hasContact) return false
      return true
    })
  }, [clients, q, filters])

  const kpis = [
    { label: 'Clientes', value: clients.length, sub: 'registrados' },
    { label: 'Con contacto', value: clients.filter((c) => !!(c.contact_name || c.contact_email || c.contact_phone)).length, sub: 'asignado' },
    { label: 'Sin contacto', value: clients.filter((c) => !(c.contact_name || c.contact_email || c.contact_phone)).length, sub: 'por completar' },
  ]

  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const drawerClient = clients.find((c) => c.id === drawerId) ?? null

  const activeFilters = Object.values(filters).filter(Boolean).length
  const chips: { key: string; label: string }[] = []
  if (filters.state) chips.push({ key: 'state', label: filters.state })
  if (filters.contact) chips.push({ key: 'contact', label: filters.contact === 'has' ? 'Con contacto' : 'Sin contacto' })

  const applySearch = (v: string) => { setQ(v); setPage(1) }

  return (
    <div className="tm">
      <header className="tm-header">
        <div>
          <h2 className="oi-title">Clientes</h2>
          <p className="oi-subtitle">Empresas que reciben servicios de auditoría y sus contactos.</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Agregar cliente</button>
      </header>

      <div className="ok-kpis">
        {kpis.map((k) => <div className="ok-kpi" key={k.label}><span className="ok-kpi-value">{k.value}</span><span className="ok-kpi-label">{k.label}</span><span className="ok-kpi-sub">{k.sub}</span></div>)}
      </div>

      <div className="tm-toolbar">
        <div className="mk-search-wrap">
          <span className="mk-search-icon" aria-hidden="true">⌕</span>
          <input className="mk-search" placeholder="Buscar por razón social, RFC, ciudad o contacto…" value={q} onChange={(e) => applySearch(e.target.value)} />
          {q && <button type="button" className="mk-search-clear" aria-label="Limpiar búsqueda" onClick={() => applySearch('')}>×</button>}
        </div>
        <button type="button" className={`mk-chip mk-chip-btn ${activeFilters > 0 ? 'active' : ''}`} onClick={() => setShowFilters(true)}>{activeFilters > 0 ? `Filtros ${activeFilters}` : 'Filtros'}</button>
        <div className="mk-switch" role="tablist"><button type="button" className={`mk-switch-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>Lista</button><button type="button" className={`mk-switch-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Tarjetas</button></div>
      </div>

      {chips.length > 0 && <div className="mk-activechips">{chips.map((c) => <button key={c.key} type="button" className="mk-chip active" onClick={() => setFilters((f) => ({ ...f, [c.key]: undefined }))}>{c.label} ×</button>)}<button type="button" className="mk-chip mk-chip-btn" onClick={() => setFilters({})}>Limpiar filtros</button></div>}

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <SkeletonRows /> : filtered.length === 0 ? <EmptyState icon="▤" title="Sin clientes" description={q || activeFilters > 0 ? 'No hay clientes que coincidan con la búsqueda o filtros.' : 'Registra tu primer cliente con "+ Agregar cliente".'} action={!q && activeFilters === 0 ? { label: '+ Agregar cliente', onClick: () => setAddOpen(true) } : undefined} /> : viewMode === 'list' ? (
        <ClientTable rows={pageRows} menuFor={menuFor} setMenuFor={setMenuFor} onOpen={(c) => setDrawerId(c.id)} />
      ) : (
        <ClientGrid rows={pageRows} onOpen={(c) => setDrawerId(c.id)} />
      )}

      {filtered.length > 0 && <Pagination page={page} pageCount={pageCount} from={(page - 1) * pageSize + 1} to={Math.min(page * pageSize, filtered.length)} total={filtered.length} setPage={setPage} />}

      {drawerClient && <ClientDrawer client={drawerClient} onClose={() => setDrawerId(null)} onSaved={() => load()} onToast={setToast} />}
      {showFilters && <ClientFiltersDrawer filters={filters} setFilters={setFilters} clients={clients} onClose={() => setShowFilters(false)} />}
      {addOpen && <AddClientModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load(); setToast('✓ Cliente creado') }} />}

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

function ClientTable({ rows, menuFor, setMenuFor, onOpen }: { rows: Client[]; menuFor: number | null; setMenuFor: (n: number | null) => void; onOpen: (c: Client) => void }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Cliente</th><th>RFC</th><th>Ubicación</th><th>Contacto</th><th></th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="tm-row" onClick={() => onOpen(c)}>
              <td><div className="oi-user-cell"><span className="oi-avatar">{initials(c.business_name)}</span><span><strong>{c.business_name}</strong>{c.commercial_name && <div className="muted small">{c.commercial_name}</div>}</span></div></td>
              <td>{c.tax_id ?? '—'}</td>
              <td>{[c.city, c.state].filter(Boolean).join(', ') || '—'}</td>
              <td>{c.contact_name ? <><div>{c.contact_name}</div><div className="muted small">{c.contact_email ?? ''}{c.contact_email && c.contact_phone ? ' · ' : ''}{c.contact_phone ?? ''}</div></> : '—'}</td>
              <td onClick={(e) => e.stopPropagation()}>
                <button type="button" className="tm-kebab" aria-label="Opciones" onClick={() => setMenuFor(menuFor === c.id ? null : c.id)}>⋮</button>
                {menuFor === c.id && (
                  <div className="tm-menu">
                    <button type="button" onClick={() => { setMenuFor(null); onOpen(c) }}>Ver perfil</button>
                    <button type="button" onClick={() => { setMenuFor(null); onOpen(c) }}>Editar cliente</button>
                    <button type="button" onClick={() => { setMenuFor(null); onOpen(c) }}>Datos de contacto</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClientGrid({ rows, onOpen }: { rows: Client[]; onOpen: (c: Client) => void }) {
  return (
    <div className="mk-grid-cards">
      {rows.map((c) => (
        <article key={c.id} className="mk-card-g" onClick={() => onOpen(c)}>
          <div className="mk-card-top"><span className="oi-avatar">{initials(c.business_name)}</span><span className="mk-badge">Cliente</span></div>
          <h3 className="mk-card-title">{c.business_name}</h3>
          {c.commercial_name && <div className="muted small">{c.commercial_name}</div>}
          <div className="mk-card-meta"><span>📍 {[c.city, c.state].filter(Boolean).join(', ') || '—'}</span><span>📄 {c.tax_id ?? '—'}</span></div>
          {c.contact_name && <div className="muted small">👤 {c.contact_name}</div>}
        </article>
      ))}
    </div>
  )
}

function ClientDrawer({ client, onClose, onSaved, onToast }: { client: Client; onClose: () => void; onSaved: () => void; onToast: (m: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ business_name: client.business_name, commercial_name: client.commercial_name ?? '', tax_id: client.tax_id ?? '', address: client.address ?? '', city: client.city ?? '', state: client.state ?? '', contact_name: client.contact_name ?? '', contact_email: client.contact_email ?? '', contact_phone: client.contact_phone ?? '', notes: client.notes ?? '' })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true); setErr('')
    try {
      await updateClient(client.id, {
        business_name: draft.business_name.trim(),
        commercial_name: draft.commercial_name.trim() || null,
        tax_id: draft.tax_id.trim() || null,
        address: draft.address.trim() || null,
        city: draft.city.trim() || null,
        state: draft.state.trim() || null,
        contact_name: draft.contact_name.trim() || null,
        contact_email: draft.contact_email.trim() || null,
        contact_phone: draft.contact_phone.trim() || null,
        notes: draft.notes.trim() || null,
      })
      setEditing(false); onSaved(); onToast('✓ Cliente actualizado')
    } catch (e) { setErr(getErrorMessage(e)) } finally { setSaving(false) }
  }
  return (
    <div className="mk-drawer-overlay" onClick={onClose}>
      <div className="mk-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Detalle de cliente">
        <div className="mk-drawer-head"><div className="oi-user-cell"><span className="oi-avatar">{initials(client.business_name)}</span><div><strong>{client.business_name}</strong>{client.commercial_name && <div className="muted small">{client.commercial_name}</div>}</div></div><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="mk-drawer-status" style={{ color: '#145da0' }}>● Cliente</div>

        {editing ? (
          <div className="form">
            <label>Razón social</label><input value={draft.business_name} onChange={(e) => setDraft({ ...draft, business_name: e.target.value })} />
            <label>Nombre comercial</label><input value={draft.commercial_name} onChange={(e) => setDraft({ ...draft, commercial_name: e.target.value })} />
            <label>RFC</label><input value={draft.tax_id} onChange={(e) => setDraft({ ...draft, tax_id: e.target.value })} />
            <label>Dirección</label><input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            <div className="form-row"><div><label>Ciudad</label><input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></div><div><label>Estado</label><input value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} /></div></div>
            <label>Contacto</label><input value={draft.contact_name} onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })} />
            <div className="form-row"><div><label>Correo del contacto</label><input type="email" value={draft.contact_email} onChange={(e) => setDraft({ ...draft, contact_email: e.target.value })} /></div><div><label>Teléfono</label><input value={draft.contact_phone} onChange={(e) => setDraft({ ...draft, contact_phone: e.target.value })} /></div></div>
            <label>Notas</label><textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            {err && <div className="alert alert-error">{err}</div>}
            <div className="row-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancelar</button><button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
          </div>
        ) : (
          <>
            <div className="oc-drawer-rows">
              <div className="oc-drawer-row"><dt>RFC</dt><dd>{client.tax_id ?? '—'}</dd></div>
              <div className="oc-drawer-row"><dt>Dirección</dt><dd>{client.address ?? '—'}</dd></div>
              <div className="oc-drawer-row"><dt>Ubicación</dt><dd>{[client.city, client.state].filter(Boolean).join(', ') || '—'}</dd></div>
              <div className="oc-drawer-row"><dt>Contacto</dt><dd>{client.contact_name ?? '—'}</dd></div>
              <div className="oc-drawer-row"><dt>Correo</dt><dd>{client.contact_email ?? '—'}</dd></div>
              <div className="oc-drawer-row"><dt>Teléfono</dt><dd>{client.contact_phone ?? '—'}</dd></div>
              {client.notes && <div className="oc-drawer-row"><dt>Notas</dt><dd>{client.notes}</dd></div>}
            </div>
            <div className="mk-detail-actions">
              <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>Editar cliente</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AddClientModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ business_name: '', commercial_name: '', tax_id: '', address: '', city: '', state: '', contact_name: '', contact_email: '', contact_phone: '', notes: '' })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    setSaving(true); setErr('')
    try {
      await createClient({
        business_name: form.business_name.trim(),
        commercial_name: form.commercial_name.trim() || null,
        tax_id: form.tax_id.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        notes: form.notes.trim() || null,
      })
      onDone()
    } catch (e) { setErr(getErrorMessage(e)) } finally { setSaving(false) }
  }
  return (
    <div className="mk-modal-overlay" onClick={onClose}>
      <div className="mk-modal tm-addmodal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Agregar cliente">
        <div className="mk-drawer-head"><h3 className="oi-panel-title">Agregar cliente</h3><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="tm-step"><strong>Datos del cliente</strong><span>Nuevo registro</span></div>
        <form className="form">
          <label>Razón social *</label><input required minLength={2} value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          <label>Nombre comercial</label><input value={form.commercial_name} onChange={(e) => setForm({ ...form, commercial_name: e.target.value })} />
          <label>RFC</label><input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} />
          <label>Dirección</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="form-row"><div><label>Ciudad</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div><div><label>Estado</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div></div>
          <label>Contacto</label><input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          <div className="form-row"><div><label>Correo del contacto</label><input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div><div><label>Teléfono</label><input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div></div>
          <label>Notas</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          {err && <div className="alert alert-error">{err}</div>}
          <div className="row-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Creando…' : 'Crear cliente'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ClientFiltersDrawer({ filters, setFilters, clients, onClose }: { filters: Filters; setFilters: (f: Filters) => void; clients: Client[]; onClose: () => void }) {
  const states = [...new Set(clients.map((c) => c.state).filter((s): s is string => !!s))].sort()
  const set = (k: keyof Filters, v: string) => setFilters({ ...filters, [k]: v || undefined })
  return (
    <div className="mk-modal-overlay" onClick={onClose}>
      <div className="mk-drawer mk-adv" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Filtros de clientes">
        <div className="mk-drawer-head"><h3 className="oi-panel-title">Filtros de clientes</h3><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="mk-adv-section"><span className="mk-section-label">Ubicación</span><select className="mk-adv-select" value={filters.state ?? ''} onChange={(e) => set('state', e.target.value)}><option value="">Todas</option>{states.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="mk-adv-section"><span className="mk-section-label">Contacto</span><select className="mk-adv-select" value={filters.contact ?? ''} onChange={(e) => set('contact', e.target.value)}><option value="">Todos</option><option value="has">Con contacto</option><option value="none">Sin contacto</option></select></div>
        <div className="mk-adv-footer"><button type="button" className="btn btn-ghost" onClick={() => setFilters({})}>Limpiar</button><button type="button" className="btn btn-primary" onClick={onClose}>Aplicar filtros</button></div>
      </div>
    </div>
  )
}
