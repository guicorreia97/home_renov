import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Locale } from '../../i18n'
import { formatMoney } from '../../lib/format'
import { anExpense } from '../../test/fixtures'
import { folded, renderWithLocale } from '../../test/renderWithLocale'
import { ExpenseRow } from './ExpenseRow'

function renderRow(expense = anExpense(), currency = 'EUR', locale: Locale = 'en') {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const { unmount, t } = renderWithLocale(
    <table>
      <tbody>
        <ExpenseRow expense={expense} currency={currency} onEdit={onEdit} onDelete={onDelete} />
      </tbody>
    </table>,
    locale,
  )
  return { onEdit, onDelete, expense, unmount, t }
}

describe('ExpenseRow', () => {
  it('shows the description, payee and category', () => {
    const { t } = renderRow()

    expect(screen.getByText('Kitchen worktop')).toBeInTheDocument()
    expect(screen.getByText('Stone & Co')).toBeInTheDocument()
    expect(screen.getByText(t('expense.category.materials'))).toBeInTheDocument()
  })

  it('renders the amount with its trailing cents intact', () => {
    renderRow(anExpense({ amount: '1234.50' }))

    // The point of keeping money a string: 1234.5 would be the wrong price.
    expect(screen.getByText(folded(formatMoney('1234.50', 'EUR', 'en')))).toBeInTheDocument()
  })

  it('shows the room as secondary detail only when there is one', () => {
    const { unmount } = renderRow(anExpense({ room: 'Kitchen' }))
    expect(screen.getByText('Kitchen')).toBeInTheDocument()
    unmount()

    renderRow(anExpense({ room: null }))

    expect(screen.queryByText('Kitchen')).not.toBeInTheDocument()
  })

  it('colours the status badge by status, never decoratively', () => {
    const cases = [
      ['paid', 'text-success'],
      ['pending', 'text-warning'],
      ['planned', 'text-muted'],
    ] as const

    for (const [status, token] of cases) {
      const { unmount, t } = renderRow(anExpense({ status }))
      expect(screen.getByText(t(`expense.status.${status}`)).className).toContain(token)
      unmount()
    }
  })

  it('gives each action an accessible name that names the expense', async () => {
    const { onEdit, onDelete, expense, t } = renderRow()

    await userEvent.click(
      screen.getByRole('button', { name: t('expense.action.editNamed', { description: 'Kitchen worktop' }) }),
    )
    await userEvent.click(
      screen.getByRole('button', {
        name: t('expense.action.deleteNamed', { description: 'Kitchen worktop' }),
      }),
    )

    expect(onEdit).toHaveBeenCalledWith(expense)
    expect(onDelete).toHaveBeenCalledWith(expense)
  })

  it('keeps both row actions off the accent, which belongs to the page action', () => {
    const { t } = renderRow()

    for (const name of [
      t('expense.action.editNamed', { description: 'Kitchen worktop' }),
      t('expense.action.deleteNamed', { description: 'Kitchen worktop' }),
    ]) {
      expect(screen.getByRole('button', { name }).className).not.toContain('bg-accent')
    }
  })

  it('renders in Portuguese, including the accessible action names', () => {
    const { t } = renderRow(anExpense(), 'EUR', 'pt-PT')

    expect(screen.getByText(t('expense.category.materials'))).toBeInTheDocument()
    expect(screen.getByText(t('expense.status.paid'))).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: t('expense.action.editNamed', { description: 'Kitchen worktop' }),
      }),
    ).toBeInTheDocument()
  })
})
