import type { ItemType } from '@kosh/shared'
import { typeColors } from '@kosh/shared'
import { typeLabel } from '@kosh/shared'

export function TypeBadge({ type }: { type: ItemType }) {
  const color = typeColors[type]
  return (
    <span className="badge" style={{ color, background: `${color}1A` }}>
      <span className="dot" style={{ background: color }} />
      {typeLabel[type]}
    </span>
  )
}
