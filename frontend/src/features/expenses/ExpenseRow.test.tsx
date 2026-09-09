import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { anExpense } from '../../test/fixtures'
import { ExpenseRow } from './ExpenseRow'

function renderRow(expense = anExpense(), currency = 'EUR') {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const { unmount } = render(
    <table>
      <tbody>
        <ExpenseRow expense={expense} currency={currency} onEdit={onEdit} onDelete={onDelete} />
      </tbody>
    </table>,
  )
  return { onEdit, onDelete, expense, unmount }
}

describe('ExpenseRow', () => {
  it('shows the description, payee and category', () => {
    renderRow()

    expect(screen.getByText('Kitchen worktop')).toBeInTheDocument()
    expect(screen.getByText('Stone & Co')).toBeInTheDocument()
    expect(screen.getByText('Materials')).toBeInTheDocument()
  })

  it('renders the amount with its trailing cents intact', () => {
    renderRow(anExpense({ amount: '1234.50' }))

    // The point of keeping money a string: 1234.5 would be the wrong price.
    expect(screen.getByText(/1[.,\s]?234[.,]50/)).toBeInTheDocument()
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
      const { unmount } = renderRow(anExpense({ status }))
      expect(screen.getByText(new RegExp(status, 'i')).className).toContain(token)
      unmount()
    }
  })

  it('gives each action an accessible name that names the expense', async () => {
    const { onEdit, onDelete, expense } = renderRow()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Kitchen worktop' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Kitchen worktop' }))

    expect(onEdit).toHaveBeenCalledWith(expense)
    expect(onDelete).toHaveBeenCalledWith(expense)
  })

  it('keeps both row actions off the accent, which belongs to the page action', () => {
    renderRow()

    for (const name of ['Edit Kitchen worktop', 'Delete Kitchen worktop']) {
      expect(screen.getByRole('button', { name }).className).not.toContain('bg-accent')
    }
  })
})
