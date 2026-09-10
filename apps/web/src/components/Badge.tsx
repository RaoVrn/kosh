interface BadgeProps {
  label: string
  color?: string
}

export function Badge({ label, color = '#9a9aa5' }: BadgeProps) {
  return (
    <span className="badge" style={{ color, background: `${color}22` }}>
      {label}
    </span>
  )
}
