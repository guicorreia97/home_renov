import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Locale } from '../../i18n'
import { anExpense } from '../../test/fixtures'
import { renderWithLocale } from '../../test/renderWithLocale'
import { apiCalls, stubApi } from '../../test/setup'
import { ExpenseFormModal } from './ExpenseFormModal'
import { formValuesFromExpense } from './validation'

const EMPTY_VALUES = {
  description: '',
  amount: '',
  category: 'materials',
  payment_method: 'bank_transfer',
  payee: '',
  incurred_on: '2026-09-01',
  status: 'paid',
  room: '',
  invoice_reference: '',
  notes: '',
} as const

function renderModal(
  props: Partial<Parameters<typeof ExpenseFormModal>[0]> = {},
  locale: Locale = 'en',
) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const { t } = renderWithLocale(
    <ExpenseFormModal
      editing={null}
      initialValues={EMPTY_VALUES}
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />,
    locale,
  )
  return { onClose, onSaved, t }
}

describe.each(['en', 'pt-PT'] as const)('ExpenseFormModal (%s)', (locale) => {
  it('titles itself for creating, and submits with the "add" caption', async () => {
    stubApi({ 'POST /expenses': { body: anExpense() } })
    const { onSaved, t } = renderModal({}, locale)

    expect(screen.getByRole('dialog')).toHaveAccessibleName(t('expenses.add'))
    expect(screen.getByRole('button', { name: t('expenses.add') })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(t('expense.field.description')), 'Kitchen worktop')
    await userEvent.type(screen.getByLabelText(t('expense.field.amount')), '1234.50')
    await userEvent.type(screen.getByLabelText(t('expense.field.payee')), 'Stone & Co')
    await userEvent.click(screen.getByRole('button', { name: t('expenses.add') }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    const posted = apiCalls.find((call) => call.method === 'POST')
    expect(posted?.body).toMatchObject({ description: 'Kitchen worktop', amount: '1234.50' })
  })

  it('labels the category, payment and status options in the active language, keeping machine values', () => {
    const { t } = renderModal({}, locale)

    const category = screen.getByRole('combobox', { name: t('expense.field.category') })
    expect(category).toHaveValue('materials')
    expect(category).toHaveDisplayValue(t('expense.category.materials'))
    expect(
      within(category).getByRole('option', { name: t('expense.category.furniture_and_fixtures') }),
    ).toHaveAttribute('value', 'furniture_and_fixtures')

    const payment = screen.getByRole('combobox', { name: t('expense.field.paymentMethod') })
    expect(payment).toHaveValue('bank_transfer')
    expect(payment).toHaveDisplayValue(t('expense.paymentMethod.bank_transfer'))

    const status = screen.getByRole('combobox', { name: t('expense.field.status') })
    expect(status).toHaveValue('paid')
    expect(status).toHaveDisplayValue(t('expense.status.paid'))
  })

  it('titles itself for editing, and submits with the "save changes" caption', async () => {
    const expense = anExpense({ amount: '1234.50' })
    stubApi({ [`PATCH /expenses/${expense.id}`]: { body: { ...expense, amount: '999.00' } } })
    const { onSaved, t } = renderModal(
      { editing: expense, initialValues: formValuesFromExpense(expense) },
      locale,
    )

    expect(screen.getByRole('dialog')).toHaveAccessibleName(t('expense.form.editTitle'))

    const amount = screen.getByLabelText(t('expense.field.amount'))
    await userEvent.clear(amount)
    await userEvent.type(amount, '999.00')
    await userEvent.click(screen.getByRole('button', { name: t('expense.form.saveChanges') }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
    const patched = apiCalls.find((call) => call.method === 'PATCH')
    expect(patched?.body).toEqual({ amount: '999.00' })
  })

  it('shows a server failure, never the raw backend detail', async () => {
    stubApi({ 'POST /expenses': { status: 500, body: { detail: 'db is on fire' } } })
    const { onSaved, t } = renderModal({}, locale)

    await userEvent.type(screen.getByLabelText(t('expense.field.description')), 'Kitchen worktop')
    await userEvent.type(screen.getByLabelText(t('expense.field.amount')), '1234.50')
    await userEvent.type(screen.getByLabelText(t('expense.field.payee')), 'Stone & Co')
    await userEvent.click(screen.getByRole('button', { name: t('expenses.add') }))

    expect(await screen.findByText(t('expense.error.server'))).toBeInTheDocument()
    expect(screen.queryByText('db is on fire')).not.toBeInTheDocument()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('closes without saving when cancelled', async () => {
    const { onClose, onSaved, t } = renderModal({}, locale)

    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t('expense.action.cancel') }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
