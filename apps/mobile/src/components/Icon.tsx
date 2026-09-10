import { Feather } from '@expo/vector-icons'
import { colors } from '../theme'
import type { IconName } from '../navigation/types'

interface IconProps {
  name: IconName
  size?: number
  color?: string
}

export function Icon({ name, size = 18, color = colors.textMuted }: IconProps) {
  return <Feather name={name} size={size} color={color} />
}
