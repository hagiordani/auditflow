export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `$${value.toLocaleString('es-MX', { maximumFractionDigits: 2 })} MXN`
}
