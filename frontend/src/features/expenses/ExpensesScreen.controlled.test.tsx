import { screen } from '@testing-library/react'
import { aBudget, aSummary, anExpense } from '../../test/fixtures'
import { renderWithLocale } from '../../test/renderWithLocale'
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
