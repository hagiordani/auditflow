import { useNavigate } from 'react-router-dom'
import type { ClientPerformance as Perf } from '../../api/reports'
import type { AuditOpportunity } from '../../api/types'
import { buildClientCards } from '../../utils/dashboard'
import { formatDate } from '../../utils/status'
import { EmptyState } from './EmptyState'

/** Rendimiento de clientes: tabla con última auditoría. */
export function ClientPerformance({
  clients,
  opportunities,
}: {
  clients: Perf[]
  opportunities: AuditOpportunity[]
}) {
  const navigate = useNavigate()
  const cards = buildClientCards(clients, opportunities)

  return (
    <section className="oi-panel oi-panel-wide oi-clients" aria-label="Rendimiento de clientes">
      <div className="oi-panel-head">
        <h3 className="oi-panel-title">Rendimiento de clientes</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/clients')}>
          Ver todos →
        </button>
      </div>
      {cards.length === 0 ? (
        <EmptyState
          icon="▤"
          title="Sin clientes todavía."
          description="Registra clientes y crea oportunidades para ver su rendimiento."
          action={{ label: 'Ver clientes', onClick: () => navigate('/clients') }}
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Auditorías</th>
                <th>En ejecución</th>
                <th>Finalizadas</th>
                <th>Cumplimiento</th>
                <th>Última auditoría</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.clientId}>
                  <td>
                    <button
                      type="button"
                      className="oi-link"
                      onClick={() => navigate('/clients')}
                    >
                      {c.name}
                    </button>
                  </td>
                  <td>{c.audits}</td>
                  <td>{c.active}</td>
                  <td>{c.finalized}</td>
                  <td>
                    <span
                      className={`badge ${
                        c.compliancePct >= 90
                          ? 'badge-valid'
                          : c.compliancePct >= 70
                            ? 'badge-busy'
                            : 'badge-invalid'
                      }`}
                    >
                      {c.compliancePct}%
                    </span>
                  </td>
                  <td>{formatDate(c.lastAudit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
