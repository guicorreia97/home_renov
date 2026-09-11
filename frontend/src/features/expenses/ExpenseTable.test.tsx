import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Locale } from '../../i18n'
import { anExpense } from '../../test/fixtures'
import { renderWithLocale } from '../../test/renderWithLocale'
import { ExpenseTable } from './ExpenseTable'

function renderTable(
  props: Partial<Parameters<typeof ExpenseTable>[0]> = {},
  locale: Locale = 'en',
) {
  const onEdit = vi.fn()
  const onDelete = vi.fn()
  const onAddFirst = vi.fn()
  const onRetry = vi.fn()
  const expenses = [anExpense()]
  const result = renderWithLocale(
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
    locale,
  )
  return { onEdit, onDelete, onAddFirst, onRetry, t: result.t }
}

describe('ExpenseTable', () => {
  it('renders a row per visible expense, under the column headers', () => {
    const { t } = renderTable()

    expect(
      screen.getByRole('columnheader', { name: t('expenses.table.header.description') }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: t('expenses.table.header.amount') }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(2) // header + one expense
  })

  it('shows a loading line before the first response arrives', () => {
    const { t } = renderTable({ allExpenses: null, visible: [] })

    expect(screen.getByText(t('expenses.table.loading'))).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a network failure instead of the table, never the backend detail', () => {
    const { t } = renderTable({ error: 'network' })

    expect(screen.getByText(t('expenses.error.network'))).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a server failure with different copy from a network failure', () => {
    const { t } = renderTable({ error: 'server' })

    expect(screen.getByText(t('expenses.error.server'))).toBeInTheDocument()
    expect(screen.queryByText(t('expenses.error.network'))).not.toBeInTheDocument()
  })

  it('offers a way out of the error without reloading the page', async () => {
    const { onRetry, t } = renderTable({ error: 'network' })

    await userEvent.click(screen.getByRole('button', { name: t('expenses.table.retry') }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('does not offer the empty-state CTA in place of the error', () => {
    const { t } = renderTable({ allExpenses: [], visible: [], error: 'network' })

    expect(screen.queryByRole('button', { name: t('expenses.add') })).not.toBeInTheDocument()
    expect(screen.queryByText(t('expenses.table.empty'))).not.toBeInTheDocument()
  })

  it('offers a real next action when there are no expenses at all', async () => {
    const { onAddFirst, t } = renderTable({ allExpenses: [], visible: [] })

    expect(screen.getByText(t('expenses.table.empty'))).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: t('expenses.add') }))
    expect(onAddFirst).toHaveBeenCalledOnce()
  })

  it('keeps the empty-state button off the accent, which the header action owns', () => {
    const { t } = renderTable({ allExpenses: [], visible: [] })

    expect(screen.getByRole('button', { name: t('expenses.add') }).className).not.toContain('bg-accent')
  })

  it('distinguishes "no expenses" from "none match the filters"', () => {
    const { t } = renderTable({ allExpenses: [anExpense()], visible: [] })

    expect(screen.getByText(t('expenses.table.emptyFiltered'))).toBeInTheDocument()
    expect(screen.queryByText(t('expenses.table.empty'))).not.toBeInTheDocument()
  })

  it('passes the row actions through to the caller', async () => {
    const { onEdit, onDelete, t } = renderTable()

    await userEvent.click(
      screen.getByRole('button', { name: t('expense.action.editNamed', { description: 'Kitchen worktop' }) }),
    )
    await userEvent.click(
      screen.getByRole('button', {
        name: t('expense.action.deleteNamed', { description: 'Kitchen worktop' }),
      }),
    )

    expect(onEdit).toHaveBeenCalledOnce()
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('renders only the filtered subset', () => {
    const all = [anExpense({ id: 'a', description: 'Worktop' }), anExpense({ id: 'b', description: 'Tiles' })]
    renderTable({ allExpenses: all, visible: [all[1]] })

    expect(screen.getByText('Tiles')).toBeInTheDocument()
    expect(screen.queryByText('Worktop')).not.toBeInTheDocument()
  })

  it('renders every header and the empty state in Portuguese', () => {
    const { t } = renderTable({ allExpenses: [], visible: [] }, 'pt-PT')

    expect(screen.getByText(t('expenses.table.empty'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('expenses.add') })).toBeInTheDocument()
  })
})
