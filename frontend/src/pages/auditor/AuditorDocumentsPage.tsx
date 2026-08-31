import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../api/client'
import {
  DOCUMENT_TYPES,
  documentDownloadUrl,
  fetchDocuments,
  uploadDocument,
} from '../../api/documents'
import { fetchMyAuditorProfile } from '../../api/portal'
import type { DocumentFile } from '../../api/types'
import { formatDateTime } from '../../utils/status'

export function AuditorDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentFile[]>([])
  const [auditorId, setAuditorId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [documentType, setDocumentType] = useState('certificate')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const load = () => {
    if (!auditorId) return
    setLoading(true)
    setError('')
    fetchDocuments('auditor', auditorId)
      .then(setDocuments)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMyAuditorProfile()
      .then((a) => setAuditorId(a.id))
      .catch((err) => setError(getErrorMessage(err)))
  }, [])

  useEffect(() => {
    if (auditorId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditorId])

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault()
    if (!file || !auditorId) return
    setFormError('')
    setSaving(true)
    try {
      await uploadDocument(file, 'auditor', auditorId, documentType)
      setFile(null)
      load()
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const typeLabel = (value: string) =>
    DOCUMENT_TYPES.find((t) => t.value === value)?.label ?? value

  return (
    <div>
      <h2 className="page-title">Mis documentos</h2>
      <p className="page-subtitle">
        Carga facturas, reportes o certificados asociados a tus servicios.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid grid-2col">
        <section className="card">
          <h3>Subir documento</h3>
          <form onSubmit={handleUpload} className="form">
            <label htmlFor="doc-type">Tipo de documento</label>
            <select
              id="doc-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              {DOCUMENT_TYPES.filter((t) =>
                ['certificate', 'report', 'invoice', 'other'].includes(t.value),
              ).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <label htmlFor="doc-file">Archivo (máx. 15 MB)</label>
            <input
              id="doc-file"
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />

            {formError && <div className="alert alert-error">{formError}</div>}

            <button type="submit" className="btn btn-primary" disabled={saving || !file}>
              {saving ? 'Subiendo…' : 'Subir documento'}
            </button>
          </form>
        </section>

        <section className="card">
          <h3>Documentos cargados ({documents.length})</h3>
          {loading && <p className="muted">Cargando…</p>}
          {!loading && (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Archivo</th>
                    <th>Fecha</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <span className="badge badge-primary">{typeLabel(d.document_type)}</span>
                      </td>
                      <td>{d.file_name}</td>
                      <td>{formatDateTime(d.uploaded_at)}</td>
                      <td>
                        <a
                          className="btn btn-sm btn-ghost"
                          href={documentDownloadUrl(d.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Descargar
                        </a>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="muted">
                        Sin documentos.
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
