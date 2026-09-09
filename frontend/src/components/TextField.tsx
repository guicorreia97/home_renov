import type { InputHTMLAttributes } from 'react'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

const inputBase =
  'mt-1 block w-full rounded-input border bg-surface-raised px-3 py-2 text-body text-text ' +
  'placeholder:text-faint focus:outline-none focus:border-accent min-h-control'

/** A labelled text/number/date input following the design system's Input spec. */
export function TextField({ label, error, hint, id, className = '', ...rest }: TextFieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div className={className}>
      <label htmlFor={inputId} className="text-label text-muted">
        {label}
      </label>
      <input
        id={inputId}
        className={`${inputBase} ${error ? 'border-danger' : 'border-border'}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="mt-1 text-label text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-label text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
