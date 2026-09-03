interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

/** Empty state diseñado: icono + mensaje + explicación + acción contextual. */
export function EmptyState({ icon = '◌', title, description, action }: EmptyStateProps) {
  return (
    <div className="oi-empty">
      <div className="oi-empty-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="oi-empty-title">{title}</div>
      {description && <div className="oi-empty-desc">{description}</div>}
      {action && (
        <button type="button" className="btn btn-sm oi-empty-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
