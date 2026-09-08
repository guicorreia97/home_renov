import { useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { SelectField } from '../../components/SelectField'
import { TextField } from '../../components/TextField'
import { categoryOptions, paymentMethodOptions, statusOptions } from './enumOptions'
import type { ExpenseFormValues } from './formTypes'
import { hasErrors, validateExpenseForm } from './validation'

export interface ExpenseFormProps {
  initialValues: ExpenseFormValues
  submitLabel: string
  submitting: boolean
  submitError: string | null
  onSubmit: (values: ExpenseFormValues) => void
  onCancel: () => void
}

/** The create/edit fields, shared by both flows — only the surrounding modal differs. */
export function ExpenseForm({
  initialValues,
  submitLabel,
  submitting,
  submitError,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const [values, setValues] = useState<ExpenseFormValues>(initialValues)
  const [errors, setErrors] = useState(validateExpenseForm(initialValues))
  const [touched, setTouched] = useState(false)

  function set<K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault()
    setTouched(true)
    const nextErrors = validateExpenseForm(values)
    setErrors(nextErrors)
    if (!hasErrors(nextErrors)) onSubmit(values)
  }

  const shown = touched ? errors : {}

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          error={shown.description}
          className="col-span-2"
          maxLength={200}
          required
        />
        <TextField
          label="Amount"
          inputMode="decimal"
          value={values.amount}
          onChange={(e) => set('amount', e.target.value)}
          error={shown.amount}
          required
        />
        <TextField
          label="Incurred on"
          type="date"
          value={values.incurred_on}
          onChange={(e) => set('incurred_on', e.target.value)}
          error={shown.incurred_on}
          required
        />
        <TextField
          label="Payee"
          value={values.payee}
          onChange={(e) => set('payee', e.target.value)}
          error={shown.payee}
          maxLength={120}
          required
        />
        <SelectField
          label="Category"
          options={categoryOptions}
          value={values.category}
          onChange={(e) => set('category', e.target.value as ExpenseFormValues['category'])}
        />
        <SelectField
          label="Payment method"
          options={paymentMethodOptions}
          value={values.payment_method}
          onChange={(e) =>
            set('payment_method', e.target.value as ExpenseFormValues['payment_method'])
          }
        />
        <SelectField
          label="Status"
          options={statusOptions}
          value={values.status}
          onChange={(e) => set('status', e.target.value as ExpenseFormValues['status'])}
        />
        <TextField
          label="Room (optional)"
          value={values.room}
          onChange={(e) => set('room', e.target.value)}
          error={shown.room}
          maxLength={80}
        />
        <TextField
          label="Invoice reference (optional)"
          value={values.invoice_reference}
          onChange={(e) => set('invoice_reference', e.target.value)}
          error={shown.invoice_reference}
          maxLength={80}
          className="col-span-2"
        />
        <TextField
          label="Notes (optional)"
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          error={shown.notes}
          maxLength={1000}
          className="col-span-2"
        />
      </div>

      {submitError && <p className="mt-4 text-body text-danger">{submitError}</p>}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
