import api from './client'
import type { DocumentFile } from './types'

export const DOCUMENT_TYPES = [
  { value: 'certificate', label: 'Certificado' },
  { value: 'service_order', label: 'Orden de servicio' },
  { value: 'agenda', label: 'Agenda de auditoría' },
  { value: 'report', label: 'Reporte' },
  { value: 'invoice', label: 'Factura' },
  { value: 'other', label: 'Otro' },
]

export async function fetchDocuments(
  entityType: string,
  entityId: number,
): Promise<DocumentFile[]> {
  const { data } = await api.get<DocumentFile[]>('/documents', {
    params: { entity_type: entityType, entity_id: entityId },
  })
  return data
}

export async function uploadDocument(
  file: File,
  entityType: string,
  entityId: number,
  documentType: string,
): Promise<DocumentFile> {
  const form = new FormData()
  form.append('file', file)
  form.append('entity_type', entityType)
  form.append('entity_id', String(entityId))
  form.append('document_type', documentType)
  const { data } = await api.post<DocumentFile>('/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export function documentDownloadUrl(id: number): string {
  const base = import.meta.env.VITE_API_URL || '/api'
  return `${base}/documents/${id}/download`
}
