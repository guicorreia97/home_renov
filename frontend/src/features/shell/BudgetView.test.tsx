import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Locale } from '../../i18n'
import { formatMoney } from '../../lib/format'
import { anExpense, aSummary } from '../../test/fixtures'
import { folded, renderWithLocale } from '../../test/renderWithLocale'
import { BudgetView } from './BudgetView'

// The category subtotals below are deliberately distinct from every expense
// amount fixture further down (50.00 / 75.00 / 333.33 / 500.00) and from a
// naive sum of them — proving what renders under a category header is the
// `CategoryTotal` field itself, never a client-side sum of the rows beneath it.
const MATERIALS = {
  category: 'materials' as const,
  amount: '3333.33', // committed = pending + paid.
  planned: '1000.00',
  pending: '1111.11',
  paid: '2222.22',
  share: 60,
}
const LABOUR = {
  category: 'labour' as const,
  amount: '650.00',
  planned: '0.00',
  pending: '0.00',
  paid: '650.00',
  share: 40,
}
const SUMMARY = aSummary({
  total_forecast: '9999.99', // also deliberately not the sum of the rows above.
  by_category: [MATERIALS, LABOUR],
})

const TILES = anExpense({ id: 'e1', category: 'materials', status: 'planned', amount: '50.00', description: 'Tiles' })
const CABINET = anExpense({
  id: 'e2',
  category: 'materials',
  status: 'pending',
  amount: '75.00',
  description: 'Cabinet',
})
const WORKTOP = anExpense({
  id: 'e3',
  category: 'materials',
  status: 'paid',
  amount: '333.33',
  description: 'Worktop',
})
const CONTRACTOR = anExpense({
  id: 'e4',
  category: 'labour',
  status: 'paid',
  amount: '500.00',
  description: 'Contractor',
})
const EXPENSES = [TILES, CABINET, WORKTOP, CONTRACTOR]

function renderView(props: Partial<Parameters<typeof BudgetView>[0]> = {}, locale: Locale = 'en') {
  const onAddExpense = vi.fn()
  const result = renderWithLocale(
    <BudgetView
      summary={SUMMARY}
      summaryLoading={false}
      summaryError={null}
      expenses={EXPENSES}
      expensesError={null}
      selectedCategory="all"
      onAddExpense={onAddExpense}
      {...props}
    />,
    locale,
  )
  return { onAddExpense, ...result }
}

describe('BudgetView', () => {
  it('shows the headline figures read straight from the summary', () => {
    const { t } = renderView()

    expect(screen.getByText(t('budget.summary.totalPaid'))).toBeInTheDocument()
    expect(screen.getByText(t('budget.summary.totalPlanned'))).toBeInTheDocument()
    expect(
      screen.getByText(folded(formatMoney(SUMMARY.total_paid, SUMMARY.currency, 'en'))),
    ).toBeInTheDocument()
  })

  // 4.1 — no arithmetic is applied to a Money value: every category subtotal
  // and the grand total are exactly the field the fixture supplied, never a
  // number that could only come from summing the rows now rendered under it.
  it('renders every category subtotal and the grand total verbatim, never a client-side sum', () => {
    renderView()

    for (const amount of [MATERIALS.planned, MATERIALS.pending, MATERIALS.paid, LABOUR.paid]) {
      expect(screen.getByText(folded(formatMoney(amount, SUMMARY.currency, 'en')))).toBeInTheDocument()
    }
    // The grand total appears once in the headline and once closing the
    // table — both read the same `total_forecast` field, so both instances
    // are expected.
    expect(
      screen.getAllByText(folded(formatMoney(SUMMARY.total_forecast, SUMMARY.currency, 'en'))),
    ).toHaveLength(2)
    // The only number a naive sum of planned+pending+paid could produce for
    // "materials" (1000.00 + 1111.11 + 2222.22) — never actually computed,
    // so never rendered either.
    expect(screen.queryByText(folded(formatMoney('4333.33', SUMMARY.currency, 'en')))).not.toBeInTheDocument()
  })

  // 4.2 — each expense's own amount lands in exactly one of the three status
  // columns, matching its own status; the other two columns show the
  // placeholder, never the amount, never a blank cell.
  it('places each expense’s amount in the column matching its own status, and only that one', () => {
    renderView()

    const cases: [typeof TILES, number][] = [
      [TILES, 0], // planned
      [CABINET, 1], // committed (pending)
      [WORKTOP, 2], // paid
    ]
    for (const [expense, matchingIndex] of cases) {
      const row = screen.getByText(expense.description).closest('tr')!
      const statusCells = within(row).getAllByRole('cell').slice(-3)

      expect(statusCells).toHaveLength(3)
      statusCells.forEach((cell, index) => {
        if (index === matchingIndex) {
          expect(folded(cell.textContent ?? '')).toBe(folded(formatMoney(expense.amount, 'EUR', 'en')))
        } else {
          expect(cell.textContent).toBe('—')
        }
      })
    }
  })

  it('reconciles a planned-only category (zero committed) into the same table', () => {
    const summary = aSummary({
      by_category: [
        { category: 'materials', amount: '0.00', planned: '400.00', pending: '0.00', paid: '0.00', share: 0 },
      ],
    })
    const { t } = renderView({ summary, expenses: [] })

    expect(screen.getByRole('row', { name: /materials/i })).toBeInTheDocument()
    expect(screen.queryByText(t('budget.view.empty'))).not.toBeInTheDocument()
  })

  // 4.3 — the overrun callout.
  it('shows the overrun callout worded from the returned figures when the API reports the budget exceeded', () => {
    const summary = aSummary({
      by_category: [MATERIALS, LABOUR],
      over_budget: true,
      planned_budget: '5000.00',
      total_forecast: '9999.99',
    })
    const { t } = renderView({ summary })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(
      screen.getByText(
        t('budget.view.overrunMessage', {
          forecast: formatMoney('9999.99', 'EUR', 'en'),
          planned: formatMoney('5000.00', 'EUR', 'en'),
        }),
      ),
    ).toBeInTheDocument()
  })

  it('shows no overrun callout when the API does not report the budget exceeded', () => {
    const summary = aSummary({ by_category: [MATERIALS, LABOUR], over_budget: false })
    renderView({ summary })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows only the selected category’s group and its own expenses when a category filter is active, subtotals unchanged', () => {
    renderView({ selectedCategory: 'labour' })

    expect(screen.getByRole('row', { name: /labour/i })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /materials/i })).not.toBeInTheDocument()
    expect(screen.getByText(folded(formatMoney(LABOUR.paid, 'EUR', 'en')))).toBeInTheDocument()
    expect(screen.getByText('Contractor')).toBeInTheDocument()
    expect(screen.queryByText('Tiles')).not.toBeInTheDocument()
    expect(screen.queryByText('Worktop')).not.toBeInTheDocument()
  })

  it('states the emptiness and offers the next action when nothing is recorded at all', async () => {
    const user = userEvent.setup()
    const summary = aSummary({ by_category: [] })
    const { onAddExpense, t } = renderView({ summary, expenses: [] })

    expect(screen.getByText(t('budget.view.empty'))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: t('expenses.add') }))
    expect(onAddExpense).toHaveBeenCalledOnce()
  })

  it('distinguishes "nothing matches the filter" from "nothing recorded at all"', () => {
    const { t } = renderView({ selectedCategory: 'utilities' })

    expect(screen.getByText(t('budget.view.emptyFiltered'))).toBeInTheDocument()
    expect(screen.queryByText(t('budget.view.empty'))).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('expenses.add') })).not.toBeInTheDocument()
  })

  it('shows a loading line before the first summary or expense list arrives', () => {
    const { t } = renderView({ summary: null, summaryLoading: true })

    expect(screen.getByText(t('budget.summary.loadingSummary'))).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a failure instead of the table, never the backend detail', () => {
    const { t } = renderView({ summary: null, summaryError: 'server' })

    expect(screen.getByText(t('budget.error.server'))).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a failure when the expense list itself fails, distinct from a summary failure', () => {
    const { t } = renderView({ expensesError: 'network' })

    expect(screen.getByText(t('budget.error.network'))).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders the heading and column headers in Portuguese too', () => {
    const { t } = renderView({}, 'pt-PT')

    expect(screen.getByRole('heading', { name: t('shell.tab.budget') })).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: t('budget.view.columnCommitted') }),
    ).toBeInTheDocument()
  })
})
