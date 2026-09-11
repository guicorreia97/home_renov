import { useState, type FormEvent } from 'react'
import { Button } from '../../components/Button'
import { SelectField } from '../../components/SelectField'
import { TextField } from '../../components/TextField'
import { translateDescriptor, useTranslation } from '../../i18n'
import type { FailureKind } from '../../lib/apiFailure'
import { categoryOptions, paymentMethodOptions, statusOptions } from './enumOptions'
import type { ExpenseFormValues } from './formTypes'
import { hasErrors, validateExpenseForm } from './validation'

export interface ExpenseFormProps {
  initialValues: ExpenseFormValues
  submitLabel: string
  submitting: boolean
  submitError: FailureKind | null
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
  const { t } = useTranslation()
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
          label={t('expense.field.description')}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          error={shown.description ? translateDescriptor(t, shown.description) : undefined}
          className="col-span-2"
          maxLength={200}
          required
        />
        <TextField
          label={t('expense.field.amount')}
          inputMode="decimal"
          value={values.amount}
          onChange={(e) => set('amount', e.target.value)}
          error={shown.amount ? translateDescriptor(t, shown.amount) : undefined}
          required
        />
        <TextField
          label={t('expense.field.incurredOn')}
          type="date"
          value={values.incurred_on}
          onChange={(e) => set('incurred_on', e.target.value)}
          error={shown.incurred_on ? translateDescriptor(t, shown.incurred_on) : undefined}
          required
        />
        <TextField
          label={t('expense.field.payee')}
          value={values.payee}
          onChange={(e) => set('payee', e.target.value)}
          error={shown.payee ? translateDescriptor(t, shown.payee) : undefined}
          maxLength={120}
          required
        />
        <SelectField
          label={t('expense.field.category')}
          options={categoryOptions(t)}
          value={values.category}
          onChange={(e) => set('category', e.target.value as ExpenseFormValues['category'])}
        />
        <SelectField
          label={t('expense.field.paymentMethod')}
          options={paymentMethodOptions(t)}
          value={values.payment_method}
          onChange={(e) =>
            set('payment_method', e.target.value as ExpenseFormValues['payment_method'])
          }
        />
        <SelectField
          label={t('expense.field.status')}
          options={statusOptions(t)}
          value={values.status}
          onChange={(e) => set('status', e.target.value as ExpenseFormValues['status'])}
        />
        <TextField
          label={t('expense.field.room')}
          value={values.room}
          onChange={(e) => set('room', e.target.value)}
          error={shown.room ? translateDescriptor(t, shown.room) : undefined}
          maxLength={80}
        />
        <TextField
          label={t('expense.field.invoiceReference')}
          value={values.invoice_reference}
          onChange={(e) => set('invoice_reference', e.target.value)}
          error={shown.invoice_reference ? translateDescriptor(t, shown.invoice_reference) : undefined}
          maxLength={80}
          className="col-span-2"
        />
        <TextField
          label={t('expense.field.notes')}
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          error={shown.notes ? translateDescriptor(t, shown.notes) : undefined}
          maxLength={1000}
          className="col-span-2"
        />
      </div>

      {submitError && (
        <p className="mt-4 text-body text-danger">
          {t(submitError === 'network' ? 'expense.error.network' : 'expense.error.server')}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          {t('expense.action.cancel')}
        </Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? t('expense.form.saving') : submitLabel}
        </Button>
      </div>
    </form>
  )
}
