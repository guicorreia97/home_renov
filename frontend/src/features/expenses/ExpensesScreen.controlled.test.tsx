import { screen } from '@testing-library/react'
import { formatMoney } from '../../lib/format'
import { aBudget, aSummary, anExpense } from '../../test/fixtures'
import { folded, renderWithLocale } from '../../test/renderWithLocale'
import { stubApi } from '../../test/setup'
import ExpensesScreen from './ExpensesScreen'
import type { ExpensesData } from './useExpensesData'

const WORKTOP = anExpense({ id: 'exp-1', description: 'Kitchen worktop' })

function controlledData(overrides: Partial<ExpensesData> = {}): ExpensesData {
  return {
    expenses: [WORKTOP],
    expensesLoading: false,
    expensesError: null,
    summary: aSummary(),
    summaryLoading: false,
    summaryError: null,
    budget: aBudget(),
    budgetLoading: false,
    budgetError: null,
    loading: false,
    budgetSaving: false,
    budgetSaveError: null,
    refresh: () => {},
    saveBudget: async () => true,
    ...overrides,
  }
}

describe('ExpensesScreen — the data prop decides who owns the add-expense button', () => {
  it('renders its own add-expense button when uncontrolled, unchanged for every existing caller', async () => {
    stubApi({
      'GET /expenses': { body: [WORKTOP] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
    })

    const { t } = renderWithLocale(<ExpensesScreen />)

    expect(await screen.findByRole('button', { name: t('expenses.add') })).toBeInTheDocument()
  })

  it('renders no add-expense button of its own once a caller passes the shared data prop', async () => {
    const { t } = renderWithLocale(
      <ExpensesScreen
        data={controlledData()}
        filters={{ status: 'all', category: 'all' }}
        onFiltersChange={() => {}}
      />,
    )

    expect(await screen.findByText('Kitchen worktop')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('expenses.add') })).not.toBeInTheDocument()
  })
})

// 4.9 — the filtered ledger's total comes from the API, not from summing the
// visible rows.
describe('ExpensesScreen — the embedded ledger’s total is read from the summary', () => {
  it('switches to the API’s own figure for a status filter, never a sum of the visible rows', async () => {
    const planned = anExpense({ id: 'exp-1', description: 'Kitchen worktop', status: 'planned', amount: '111.00' })
    const paid = anExpense({ id: 'exp-2', description: 'Sofa', status: 'paid', amount: '222.00' })
    // Deliberately neither 111 + 222 nor 111: proves each figure shown is the
    // field the summary supplied, not a sum of whichever rows are visible.
    const summary = aSummary({ total_committed: '999.99', total_planned: '888.88', by_category: [] })
    const data = {
      expenses: [planned, paid],
      expensesLoading: false,
      expensesError: null,
      summary,
      summaryLoading: false,
      summaryError: null,
      budget: aBudget(),
      budgetLoading: false,
      budgetError: null,
      loading: false,
      budgetSaving: false,
      budgetSaveError: null,
      refresh: () => {},
      saveBudget: async () => true,
    }

    const { t, rerender } = renderWithLocale(
      <ExpensesScreen
        data={data}
        filters={{ status: 'all', category: 'all' }}
        onFiltersChange={() => {}}
      />,
    )

    await screen.findByText('Kitchen worktop')
    expect(screen.getByText(folded(formatMoney('999.99', summary.currency, 'en')))).toBeInTheDocument()

    // Narrow the status filter — the visible rows shrink to one expense.
    rerender(
      <ExpensesScreen
        data={data}
        filters={{ status: 'planned', category: 'all' }}
        onFiltersChange={() => {}}
      />,
    )

    expect(screen.getByText('Kitchen worktop')).toBeInTheDocument()
    expect(screen.queryByText('Sofa')).not.toBeInTheDocument()
    // Only planned rows are visible, so the total is the API's planned figure,
    // labelled as such — not committed spend, which counts none of these rows,
    // and not 111.00 recomputed from the one row left on screen.
    expect(screen.queryByText(t('budget.summary.totalCommitted'))).not.toBeInTheDocument()
    const totalLabel = screen.getByText(t('budget.summary.totalPlanned'))
    const totalValue = totalLabel.parentElement?.querySelector('span:last-child')
    expect(folded(totalValue?.textContent ?? '')).toBe(folded(formatMoney('888.88', summary.currency, 'en')))
  })
})
