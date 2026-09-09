import type { SelectHTMLAttributes } from 'react'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption[]
  error?: string
}

const selectBase =
  'mt-1 block w-full rounded-input border bg-surface-raised px-3 py-2 text-body text-text ' +
  'focus:outline-none focus:border-accent min-h-control'

/** A labelled `<select>` following the design system's Input spec. */
export function SelectField({
  label,
  options,
  error,
  id,
  className = '',
  ...rest
}: SelectFieldProps) {
  const selectId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className={className}>
      <label htmlFor={selectId} className="text-label text-muted">
        {label}
      </label>
      <select
        id={selectId}
        className={`${selectBase} ${error ? 'border-danger' : 'border-border'}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1 text-label text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
