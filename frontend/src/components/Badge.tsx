import type { ReactNode } from 'react'

/** Status color only — never used decoratively (design guide, Color tokens). */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral'

export interface BadgeProps {
  tone: BadgeTone
  children: ReactNode
}

const tones: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-surface-raised text-muted',
}

/** A pill badge, status color at 15% opacity fill with full-strength text. */
export function Badge({ tone, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-label ${tones[tone]}`}
    >
      {children}
    </span>
  )
}
