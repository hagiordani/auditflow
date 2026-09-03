import { useEffect, useMemo, useState } from 'react'
import { createCompetency, fetchCompetencies, updateCompetency } from '../../api/competencies'
import { getErrorMessage } from '../../api/client'
import type { Competency } from '../../api/types'
import { EmptyState } from '../../components/dashboard/EmptyState'

type ViewMode = 'list' | 'grid'

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || 'CP'
}

export function CompetenciesPage() {
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [page, setPage] = useState(1)
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const [drawerId, setDrawerId] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [toast, setToast] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    fetchCompetencies()
      .then(setCompetencies)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return competencies.filter((c) => {
      const hay = `${c.name} ${c.description ?? ''}`.toLowerCase()
      return !term || hay.includes(term)
    })
  }, [competencies, q])

  const kpis = [
    { label: 'Competencias', value: competencies.length, sub: 'en el catálogo' },
    { label: 'Activas', value: competencies.filter((c) => c.is_active).length, sub: 'disponibles' },
    { label: 'Desactivadas', value: competencies.filter((c) => !c.is_active).length, sub: 'sin uso' },
  ]

  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const drawerComp = competencies.find((c) => c.id === drawerId) ?? null

  const toggleActive = async (comp: Competency) => {
    setError('')
    try { const up = await updateCompetency(comp.id, { is_active: !comp.is_active }); setCompetencies((prev) => prev.map((c) => (c.id === up.id ? up : c))); setToast(`✓ ${comp.name} ${up.is_active ? 'activada' : 'desactivada'}`) } catch (err) { setError(getErrorMessage(err)) }
  }

  const applySearch = (v: string) => { setQ(v); setPage(1) }

  return (
    <div className="tm">
      <header className="tm-header">
        <div>
          <h2 className="oi-title">Competencias</h2>
          <p className="oi-subtitle">Catálogo de normas y especialidades que se pueden exigir en una auditoría (ISO 9001, ISO 14001, ISO 45001…).</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Agregar competencia</button>
      </header>

      <div className="ok-kpis">
        {kpis.map((k) => <div className="ok-kpi" key={k.label}><span className="ok-kpi-value">{k.value}</span><span className="ok-kpi-label">{k.label}</span><span className="ok-kpi-sub">{k.sub}</span></div>)}
      </div>

      <div className="tm-toolbar">
        <div className="mk-search-wrap">
          <span className="mk-search-icon" aria-hidden="true">⌕</span>
          <input className="mk-search" placeholder="Buscar por nombre o descripción…" value={q} onChange={(e) => applySearch(e.target.value)} />
          {q && <button type="button" className="mk-search-clear" aria-label="Limpiar búsqueda" onClick={() => applySearch('')}>×</button>}
        </div>
        <div className="mk-switch" role="tablist"><button type="button" className={`mk-switch-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>Lista</button><button type="button" className={`mk-switch-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>Tarjetas</button></div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <SkeletonRows /> : filtered.length === 0 ? <EmptyState icon="✓" title="Sin competencias" description={q ? 'No hay competencias que coincidan con la búsqueda.' : 'Agrega tu primera competencia (p. ej. ISO 9001).'} action={!q ? { label: '+ Agregar competencia', onClick: () => setAddOpen(true) } : undefined} /> : viewMode === 'list' ? (
        <CompetencyTable rows={pageRows} menuFor={menuFor} setMenuFor={setMenuFor} onOpen={(c) => setDrawerId(c.id)} onToggle={toggleActive} />
      ) : (
        <CompetencyGrid rows={pageRows} onOpen={(c) => setDrawerId(c.id)} />
      )}

      {filtered.length > 0 && <Pagination page={page} pageCount={pageCount} from={(page - 1) * pageSize + 1} to={Math.min(page * pageSize, filtered.length)} total={filtered.length} setPage={setPage} />}

      {drawerComp && <CompetencyDrawer comp={drawerComp} onClose={() => setDrawerId(null)} onToggle={toggleActive} onSaved={() => load()} onToast={setToast} />}
      {addOpen && <AddCompetencyModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load(); setToast('✓ Competencia creada') }} />}

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

function CompetencyTable({ rows, menuFor, setMenuFor, onOpen, onToggle }: { rows: Competency[]; menuFor: number | null; setMenuFor: (n: number | null) => void; onOpen: (c: Competency) => void; onToggle: (c: Competency) => void }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Competencia</th><th>Descripción</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="tm-row" onClick={() => onOpen(c)}>
              <td><div className="oi-user-cell"><span className="oi-avatar">{initials(c.name)}</span><strong>{c.name}</strong></div></td>
              <td className="muted">{c.description || '—'}</td>
              <td><span className={`badge ${c.is_active ? 'badge-valid' : 'badge-invalid'}`}>{c.is_active ? 'Activa' : 'Desactivada'}</span></td>
              <td onClick={(e) => e.stopPropagation()}>
                <button type="button" className="tm-kebab" aria-label="Opciones" onClick={() => setMenuFor(menuFor === c.id ? null : c.id)}>⋮</button>
                {menuFor === c.id && (
                  <div className="tm-menu">
                    <button type="button" onClick={() => { setMenuFor(null); onOpen(c) }}>Ver detalle</button>
                    <button type="button" onClick={() => { setMenuFor(null); onOpen(c) }}>Editar competencia</button>
                    <button type="button" onClick={() => { setMenuFor(null); onToggle(c) }}>{c.is_active ? 'Desactivar' : 'Activar'}</button>
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

function CompetencyGrid({ rows, onOpen }: { rows: Competency[]; onOpen: (c: Competency) => void }) {
  return (
    <div className="mk-grid-cards">
      {rows.map((c) => (
        <article key={c.id} className="mk-card-g" onClick={() => onOpen(c)}>
          <div className="mk-card-top"><span className="oi-avatar">{initials(c.name)}</span><span className={`badge ${c.is_active ? 'badge-valid' : 'badge-invalid'}`}>{c.is_active ? 'Activa' : 'Desactivada'}</span></div>
          <h3 className="mk-card-title">{c.name}</h3>
          <div className="muted small">{c.description || 'Sin descripción'}</div>
        </article>
      ))}
    </div>
  )
}

function CompetencyDrawer({ comp, onClose, onToggle, onSaved, onToast }: { comp: Competency; onClose: () => void; onToggle: (c: Competency) => void; onSaved: () => void; onToast: (m: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ name: comp.name, description: comp.description ?? '' })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true); setErr('')
    try { await updateCompetency(comp.id, { name: draft.name.trim(), description: draft.description.trim() || undefined }); setEditing(false); onSaved(); onToast('✓ Competencia actualizada') } catch (e) { setErr(getErrorMessage(e)) } finally { setSaving(false) }
  }
  return (
    <div className="mk-drawer-overlay" onClick={onClose}>
      <div className="mk-drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Detalle de competencia">
        <div className="mk-drawer-head"><div className="oi-user-cell"><span className="oi-avatar">{initials(comp.name)}</span><div><strong>{comp.name}</strong></div></div><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="mk-drawer-status" style={{ color: comp.is_active ? '#16a34a' : '#c2410c' }}>● {comp.is_active ? 'Activa' : 'Desactivada'}</div>

        {editing ? (
          <div className="form">
            <label>Nombre</label><input required minLength={2} maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <label>Descripción</label><textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            {err && <div className="alert alert-error">{err}</div>}
            <div className="row-actions"><button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancelar</button><button type="button" className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
          </div>
        ) : (
          <>
            <div className="oc-drawer-rows">
              <div className="oc-drawer-row"><dt>Nombre</dt><dd>{comp.name}</dd></div>
              <div className="oc-drawer-row"><dt>Descripción</dt><dd>{comp.description || '—'}</dd></div>
              <div className="oc-drawer-row"><dt>Estado</dt><dd>{comp.is_active ? 'Activa' : 'Desactivada'}</dd></div>
            </div>
            <div className="mk-detail-actions">
              <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>Editar competencia</button>
              <button type="button" className="btn btn-ghost" onClick={() => onToggle(comp)}>{comp.is_active ? 'Desactivar' : 'Activar'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function AddCompetencyModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', description: '' })
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async () => {
    setSaving(true); setErr('')
    try { await createCompetency({ name: form.name.trim(), description: form.description.trim() || undefined }); onDone() } catch (e) { setErr(getErrorMessage(e)) } finally { setSaving(false) }
  }
  return (
    <div className="mk-modal-overlay" onClick={onClose}>
      <div className="mk-modal tm-addmodal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Agregar competencia">
        <div className="mk-drawer-head"><h3 className="oi-panel-title">Agregar competencia</h3><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div className="tm-step"><strong>Nueva competencia</strong><span>Catálogo de normas</span></div>
        <form className="form">
          <label>Nombre *</label><input required minLength={2} maxLength={120} placeholder="ISO 9001" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label>Descripción (opcional)</label><textarea placeholder="Sistema de gestión de calidad" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          {err && <div className="alert alert-error">{err}</div>}
          <div className="row-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={submit}>{saving ? 'Creando…' : 'Crear competencia'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
