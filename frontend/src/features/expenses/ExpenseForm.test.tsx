import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Locale } from '../../i18n'
import { renderWithLocale } from '../../test/renderWithLocale'
import { ExpenseForm } from './ExpenseForm'
import type { ExpenseFormValues } from './formTypes'

function values(overrides: Partial<ExpenseFormValues> = {}): ExpenseFormValues {
  return {
    description: 'Kitchen worktop',
    amount: '1234.50',
    category: 'materials',
    payment_method: 'bank_transfer',
    payee: 'Stone & Co',
    incurred_on: '2026-09-01',
    status: 'paid',
    room: '',
    invoice_reference: '',
    notes: '',
    ...overrides,
  }
}

function renderForm(
  initial = values(),
  props: Partial<Parameters<typeof ExpenseForm>[0]> = {},
  locale: Locale = 'en',
) {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  const { t } = renderWithLocale(
    <ExpenseForm
      initialValues={initial}
      submitLabel="Save expense"
      submitting={false}
      submitError={null}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
    locale,
  )
  return { onSubmit, onCancel, t }
}

describe('ExpenseForm', () => {
  it('seeds every field from the initial values', () => {
    const { t } = renderForm()

    expect(screen.getByLabelText(t('expense.field.description'))).toHaveValue('Kitchen worktop')
    expect(screen.getByLabelText(t('expense.field.amount'))).toHaveValue('1234.50')
    expect(screen.getByLabelText(t('expense.field.payee'))).toHaveValue('Stone & Co')
    expect(screen.getByLabelText(t('expense.field.incurredOn'))).toHaveValue('2026-09-01')
  })

  it('shows no validation errors before the first submit', () => {
    const { t } = renderForm(values({ description: '', amount: '' }))

    expect(screen.queryByText(t('expense.error.amountInvalid'))).not.toBeInTheDocument()
    expect(screen.queryByText(t('expense.error.descriptionLength'))).not.toBeInTheDocument()
  })

  it('submits the typed values when they are valid', async () => {
    const { onSubmit } = renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: '1234.50' }))
  })

  it('blocks submission and shows the message when a field is invalid', async () => {
    const { onSubmit, t } = renderForm(values({ amount: '0' }))

    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText(t('expense.field.amount'))).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(t('expense.error.amountInvalid'))).toBeInTheDocument()
  })

  it('passes the amount through as the exact string typed, never a number', async () => {
    const { onSubmit, t } = renderForm(values({ amount: '' }))

    await userEvent.type(screen.getByLabelText(t('expense.field.amount')), '1234.50')
    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    const submitted = onSubmit.mock.calls[0][0] as ExpenseFormValues
    expect(submitted.amount).toBe('1234.50')
    expect(typeof submitted.amount).toBe('string')
  })

  it('clears the error once the field is corrected and resubmitted', async () => {
    const { onSubmit, t } = renderForm(values({ description: '' }))

    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText(t('expense.field.description')), 'Tiles')
    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('cancels without submitting', async () => {
    const { onSubmit, onCancel, t } = renderForm()

    await userEvent.click(screen.getByRole('button', { name: t('expense.action.cancel') }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables both actions and says so while submitting', () => {
    const { t } = renderForm(values(), { submitting: true })

    expect(screen.getByRole('button', { name: t('expense.form.saving') })).toBeDisabled()
    expect(screen.getByRole('button', { name: t('expense.action.cancel') })).toBeDisabled()
  })

  it('surfaces a network failure, never the raw backend detail', () => {
    const { t } = renderForm(values(), { submitError: 'network' })

    expect(screen.getByText(t('expense.error.network'))).toBeInTheDocument()
  })

  it('surfaces a server failure with different copy from a network failure', () => {
    const { t } = renderForm(values(), { submitError: 'server' })

    expect(screen.getByText(t('expense.error.server'))).toBeInTheDocument()
    expect(screen.queryByText(t('expense.error.network'))).not.toBeInTheDocument()
  })

  it('renders every field label and error in Portuguese', async () => {
    const { t } = renderForm(values({ amount: '0' }), {}, 'pt-PT')

    for (const key of [
      'expense.field.description',
      'expense.field.amount',
      'expense.field.incurredOn',
      'expense.field.payee',
      'expense.field.category',
      'expense.field.paymentMethod',
      'expense.field.status',
      'expense.field.room',
      'expense.field.invoiceReference',
      'expense.field.notes',
    ] as const) {
      expect(screen.getByLabelText(t(key))).toBeInTheDocument()
    }

    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))
    expect(screen.getByText(t('expense.error.amountInvalid'))).toBeInTheDocument()
  })
})
