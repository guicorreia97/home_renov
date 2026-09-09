import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

function renderForm(initial = values(), props: Partial<Parameters<typeof ExpenseForm>[0]> = {}) {
  const onSubmit = vi.fn()
  const onCancel = vi.fn()
  render(
    <ExpenseForm
      initialValues={initial}
      submitLabel="Save expense"
      submitting={false}
      submitError={null}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { onSubmit, onCancel }
}

describe('ExpenseForm', () => {
  it('seeds every field from the initial values', () => {
    renderForm()

    expect(screen.getByLabelText('Description')).toHaveValue('Kitchen worktop')
    expect(screen.getByLabelText('Amount')).toHaveValue('1234.50')
    expect(screen.getByLabelText('Payee')).toHaveValue('Stone & Co')
    expect(screen.getByLabelText('Incurred on')).toHaveValue('2026-09-01')
  })

  it('shows no validation errors before the first submit', () => {
    renderForm(values({ description: '', amount: '' }))

    expect(screen.queryByText(/must be/i)).not.toBeInTheDocument()
  })

  it('submits the typed values when they are valid', async () => {
    const { onSubmit } = renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: '1234.50' }))
  })

  it('blocks submission and shows the message when a field is invalid', async () => {
    const { onSubmit } = renderForm(values({ amount: '0' }))

    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/must be a positive number/i)).toBeInTheDocument()
  })

  it('passes the amount through as the exact string typed, never a number', async () => {
    const { onSubmit } = renderForm(values({ amount: '' }))

    await userEvent.type(screen.getByLabelText('Amount'), '1234.50')
    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    const submitted = onSubmit.mock.calls[0][0] as ExpenseFormValues
    expect(submitted.amount).toBe('1234.50')
    expect(typeof submitted.amount).toBe('string')
  })

  it('clears the error once the field is corrected and resubmitted', async () => {
    const { onSubmit } = renderForm(values({ description: '' }))

    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Description'), 'Tiles')
    await userEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('cancels without submitting', async () => {
    const { onSubmit, onCancel } = renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables both actions and says so while submitting', () => {
    renderForm(values(), { submitting: true })

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('surfaces a server-side failure', () => {
    renderForm(values(), { submitError: 'amount: must be greater than 0' })

    expect(screen.getByText('amount: must be greater than 0')).toBeInTheDocument()
  })
})
