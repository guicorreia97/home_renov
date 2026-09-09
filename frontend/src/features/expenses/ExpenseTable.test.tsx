import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { anExpense } from '../../test/fixtures'
import { ExpenseTable } from './ExpenseTable'

function renderTable(props: Partial<Parameters<typeof ExpenseTable>[0]> = {}) {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const onAddFirst = vi.fn()
  const onRetry = vi.fn()
  const expenses = [anExpense()]
  render(
    <ExpenseTable
      allExpenses={expenses}
      visible={expenses}
      currency="EUR"
      error={null}
      onEdit={onEdit}
      onDelete={onDelete}
      onAddFirst={onAddFirst}
      onRetry={onRetry}
      {...props}
    />,
  )
  return { onEdit, onDelete, onAddFirst, onRetry }
}

describe('ExpenseTable', () => {
  it('renders a row per visible expense, under the column headers', () => {
    renderTable()

    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(2) // header + one expense
  })

  it('shows a loading line before the first response arrives', () => {
    renderTable({ allExpenses: null, visible: [] })

    expect(screen.getByText('Loading expenses…')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the error instead of the table when the list failed', () => {
    renderTable({ error: 'Could not reach the API' })

    expect(screen.getByText('Could not reach the API')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('offers a way out of the error without reloading the page', async () => {
    const { onRetry } = renderTable({ error: 'Could not reach the API' })

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('does not offer the empty-state CTA in place of the error', () => {
    renderTable({ allExpenses: [], visible: [], error: 'Could not reach the API' })

    expect(screen.queryByRole('button', { name: 'Add expense' })).not.toBeInTheDocument()
    expect(screen.queryByText(/No expenses recorded yet/i)).not.toBeInTheDocument()
  })

  it('offers a real next action when there are no expenses at all', async () => {
    const { onAddFirst } = renderTable({ allExpenses: [], visible: [] })

    expect(screen.getByText(/No expenses recorded yet/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    expect(onAddFirst).toHaveBeenCalledOnce()
  })

  it('keeps the empty-state button off the accent, which the header action owns', () => {
    renderTable({ allExpenses: [], visible: [] })

    expect(screen.getByRole('button', { name: 'Add expense' }).className).not.toContain('bg-accent')
  })

  it('distinguishes "no expenses" from "none match the filters"', () => {
    renderTable({ allExpenses: [anExpense()], visible: [] })

    expect(screen.getByText(/No expenses match the current filters/i)).toBeInTheDocument()
    expect(screen.queryByText(/No expenses recorded yet/i)).not.toBeInTheDocument()
  })

  it('passes the row actions through to the caller', async () => {
    const { onEdit, onDelete } = renderTable()

    await userEvent.click(screen.getByRole('button', { name: 'Edit Kitchen worktop' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Kitchen worktop' }))

    expect(onEdit).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('renders only the filtered subset', () => {
    const all = [anExpense({ id: 'a', description: 'Worktop' }), anExpense({ id: 'b', description: 'Tiles' })]
    renderTable({ allExpenses: all, visible: [all[1]] })

    expect(screen.getByText('Tiles')).toBeInTheDocument()
    expect(screen.queryByText('Worktop')).not.toBeInTheDocument()
  })
})
