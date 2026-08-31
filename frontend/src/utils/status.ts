import type { OpportunityStatus } from '../api/types'

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  has_interested: 'Con interesados',
  under_review: 'En revisión',
  assigned: 'Asignada',
  confirmed: 'Confirmada',
  in_progress: 'En ejecución',
  completed: 'Terminada',
  invoice_received: 'Factura recibida',
  paid: 'Pagada',
  cancelled: 'Cancelada',
}

export const OPPORTUNITY_STATUS_CLASS: Record<OpportunityStatus, string> = {
  draft: 'status-draft',
  published: 'status-published',
  has_interested: 'status-review',
  under_review: 'status-review',
  assigned: 'status-assigned',
  confirmed: 'status-assigned',
  in_progress: 'status-progress',
  completed: 'status-done',
  invoice_received: 'status-done',
  paid: 'status-paid',
  cancelled: 'status-cancelled',
}

/** Espejo de ALLOWED_TRANSITIONS del backend (máquina de estados). */
export const ALLOWED_TRANSITIONS: Record<OpportunityStatus, OpportunityStatus[]> = {
  draft: ['published', 'cancelled'],
  published: ['has_interested', 'under_review', 'assigned', 'cancelled'],
  has_interested: ['under_review', 'assigned', 'cancelled'],
  under_review: ['assigned', 'cancelled'],
  assigned: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
  completed: ['invoice_received'],
  invoice_received: ['paid'],
  paid: [],
  cancelled: [],
}

export const EXPENSE_LABELS: Record<string, string> = {
  included: 'Incluidos',
  not_included: 'No incluidos',
}

export const ACTION_LABELS: Record<string, string> = {
  create: 'Creación',
  update: 'Modificación',
  publish: 'Publicación',
  transition: 'Cambio de estado',
  cancel: 'Cancelación',
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
