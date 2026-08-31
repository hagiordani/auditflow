import api from './client'

export interface ReportsSummary {
  total_opportunities: number
  opportunities_by_status: Record<string, number>
  total_auditors: number
  active_auditors: number
  pending_confirmations: number
  confirmed_assignments: number
  confirmed_cost_total: number
  cost_this_month: number
  expiring_certifications_60d: number
  invoices_pending: number
}

export interface AuditorSummary {
  available_opportunities: number
  my_applications: number
  upcoming_assignments: number
  occupied_days: number
  my_documents: number
  expiring_my_certifications_90d: number
}

export interface ClientReport {
  client_id: number
  business_name: string
  commercial_name: string | null
  total: number
}

export interface AuditorUsage {
  auditor_id: number
  name: string
  email: string
  total_assignments: number
  confirmed: number
}

export interface ExpiringCertification {
  auditor: string
  competency: string
  level: string
  valid_until: string
  days_left: number
}

export async function fetchSummary(): Promise<ReportsSummary> {
  const { data } = await api.get<ReportsSummary>('/reports/summary')
  return data
}

export async function fetchAuditorSummary(): Promise<AuditorSummary> {
  const { data } = await api.get<AuditorSummary>('/reports/auditor-summary')
  return data
}

export async function fetchByClient(): Promise<ClientReport[]> {
  const { data } = await api.get<ClientReport[]>('/reports/by-client')
  return data
}

export async function fetchAuditorsUsage(): Promise<AuditorUsage[]> {
  const { data } = await api.get<AuditorUsage[]>('/reports/auditors-usage')
  return data
}

export async function fetchExpiringCertifications(days = 60): Promise<ExpiringCertification[]> {
  const { data } = await api.get<ExpiringCertification[]>('/reports/expiring-certifications', {
    params: { days },
  })
  return data
}

export async function downloadOpportunitiesCsv(): Promise<void> {
  const response = await api.get('/reports/export.csv', { responseType: 'blob' })
  const url = URL.createObjectURL(response.data as Blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'oportunidades_auditflow.csv'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
