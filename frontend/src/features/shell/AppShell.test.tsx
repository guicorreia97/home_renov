import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import { aBudget, aSummary, anExpense } from '../../test/fixtures'
import { renderWithLocale } from '../../test/renderWithLocale'
import { stubApi } from '../../test/setup'
import { AppShell } from './AppShell'

const WORKTOP = anExpense({ id: 'exp-1', description: 'Kitchen worktop', category: 'materials' })
const SOFA = anExpense({ id: 'exp-2', description: 'Sofa', category: 'labour', payee: 'Loja' })

const TWO_CATEGORY_SUMMARY = aSummary({
  by_category: [
    { category: 'materials', amount: '900.00', planned: '0.00', pending: '0.00', paid: '900.00', share: 70 },
    { category: 'labour', amount: '400.00', planned: '0.00', pending: '0.00', paid: '400.00', share: 30 },
  ],
})

function stubShellData(): void {
  stubApi({
    'GET /expenses': { body: [WORKTOP, SOFA] },
    'GET /budget': { body: aBudget() },
    'GET /budget/summary': { body: TWO_CATEGORY_SUMMARY },
  })
}

describe('AppShell', () => {
  it('selecting a category in the rail sets the ledger tab’s existing filter, not a second mechanism', async () => {
    const user = userEvent.setup()
    stubShellData()
    const { t } = renderWithLocale(<AppShell />)
    await screen.findByText('Kitchen worktop')
    expect(screen.getByText('Sofa')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: t('expense.category.labour') }))

    await waitFor(() => expect(screen.queryByText('Kitchen worktop')).not.toBeInTheDocument())
    expect(screen.getByText('Sofa')).toBeInTheDocument()
    // The existing status/category filter row reflects the same state.
    expect(screen.getByLabelText(t('expense.field.category'))).toHaveValue('labour')
  })

  it('keeps the category filter applied across a tab switch', async () => {
    const user = userEvent.setup()
    stubShellData()
    const { t } = renderWithLocale(<AppShell />)
    await screen.findByText('Kitchen worktop')

    await user.click(screen.getByRole('button', { name: t('expense.category.labour') }))
    await waitFor(() => expect(screen.queryByText('Kitchen worktop')).not.toBeInTheDocument())

    await user.click(screen.getByRole('tab', { name: t('shell.tab.budget') }))
    expect(screen.getByRole('tab', { name: t('shell.tab.budget') })).toHaveAttribute('aria-selected', 'true')
    // The budget tab is a live view of the same filter, not a blank panel: it
    // shows the labour group (and Sofa, the labour expense within it) and
    // nothing from the materials group.
    expect(await screen.findByText('Sofa')).toBeInTheDocument()
    expect(screen.queryByText('Kitchen worktop')).not.toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /materials/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: t('shell.tab.ledger') }))
    expect(screen.getByRole('button', { name: t('expense.category.labour') })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(await screen.findByText('Sofa')).toBeInTheDocument()
    expect(screen.queryByText('Kitchen worktop')).not.toBeInTheDocument()
  })

  it('renders the ledger tab active by default, with the sidebar and header alongside it', async () => {
    stubShellData()
    const { t } = renderWithLocale(<AppShell />)

    expect(await screen.findByRole('tablist', { name: t('shell.tabs.label') })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: t('shell.tab.ledger') })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: t('shell.sidebar.categoriesHeading') })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: t('expenses.title') })).toBeInTheDocument()
  })

  it('renders every landmark and label under Portuguese too', async () => {
    stubShellData()
    const { t } = renderWithLocale(<AppShell />, 'pt-PT')

    expect(await screen.findByRole('tablist', { name: t('shell.tabs.label') })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: t('shell.sidebar.categoriesHeading') })).toBeInTheDocument()
    // The planned-budget label appears both in the header's assumptions and in
    // the ledger tab's own budget strip.
    expect(screen.getAllByText(t('budget.field.plannedBudget')).length).toBeGreaterThan(0)
  })

  it('draws no shell when the health check fails — the connection-failure message renders instead', async () => {
    stubApi({ 'GET /healthcheck': { status: 500, body: { detail: 'boom' } } })
    const { t } = renderWithLocale(<App />)

    expect(
      await screen.findByRole('heading', { name: t('app.connection.title') }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('draws the shell once the health check succeeds', async () => {
    stubApi({
      'GET /healthcheck': { body: { message: 'OK' } },
      'GET /expenses': { body: [] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary({ expense_count: 0, by_category: [] }) },
    })
    const { t } = renderWithLocale(<App />)

    expect(await screen.findByRole('tablist', { name: t('shell.tabs.label') })).toBeInTheDocument()
  })
})
