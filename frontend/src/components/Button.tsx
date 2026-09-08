import type { ButtonHTMLAttributes, ReactNode } from 'react'

/**
 * The four button shapes from docs/design-system-guide.md. Only `primary`
 * carries the accent fill — a screen should have exactly one of those visible
 * at a time (rule: "the accent appears once per view as the primary action").
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

const base =
  'inline-flex min-h-control items-center justify-center gap-2 rounded-button px-4 py-2 ' +
  'text-body font-medium transition-colors duration-150 ease-out disabled:cursor-not-allowed ' +
  'disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-bg hover:bg-accent-hover',
  secondary: 'border border-border bg-transparent text-text hover:bg-surface-raised',
  ghost: 'text-muted hover:text-text',
  destructive: 'bg-danger text-bg hover:opacity-90',
}

/** A button whose visual weight matches its role. Always a real `<button>`. */
export function Button({ variant = 'secondary', className = '', ...rest }: ButtonProps) {
  const classes = [base, variants[variant], className].filter(Boolean).join(' ')
  return <button type="button" className={classes} {...rest} />
}
