import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { aBudget, aSummary, anExpense } from '../../test/fixtures'
import { apiCalls, stubApi } from '../../test/setup'
import ExpensesScreen from './ExpensesScreen'

const WORKTOP = anExpense({ id: 'exp-1', description: 'Kitchen worktop', amount: '1234.50' })
async function screenReady(): Promise<void> {
  await waitFor(() => expect(screen.queryByText('Loading expenses…')).not.toBeInTheDocument())
}

describe('ExpensesScreen', () => {
  it('walks create → filter → edit → delete with the summary updating at each step', async () => {
    const user = userEvent.setup()
    stubApi({
      // One entry per actual refresh: mount, then after each mutation.
      // Filtering is client-side and re-reads nothing.
      'GET /expenses': [
        { body: [] },
        { body: [WORKTOP] },
        { body: [{ ...WORKTOP, amount: '999.00' }] },
        { body: [] },
      ],
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': [
        { body: aSummary({ expense_count: 0, total_paid: '0.00' }) },
        { body: aSummary({ expense_count: 1, total_paid: '1234.50' }) },
        { body: aSummary({ expense_count: 1, total_paid: '999.00' }) },
        { body: aSummary({ expense_count: 0, total_paid: '0.00' }) },
      ],
      'POST /expenses': { body: WORKTOP },
      'PATCH /expenses/exp-1': { body: { ...WORKTOP, amount: '999.00' } },
      'DELETE /expenses/exp-1': { status: 204 },
    })

    render(<ExpensesScreen />)
    await screenReady()

    // Empty to begin with.
    expect(screen.getByText(/No expenses recorded yet/i)).toBeInTheDocument()

    // --- Create -------------------------------------------------------------
    // Two buttons carry this name in the empty state — the header action and
    // the empty-state CTA. The header one is the page's single accent.
    const [headerAdd] = screen.getAllByRole('button', { name: 'Add expense' })
    await user.click(headerAdd)
    const createDialog = screen.getByRole('dialog')
    expect(createDialog).toHaveAccessibleName('Add expense')

    await user.type(within(createDialog).getByLabelText('Description'), 'Kitchen worktop')
    await user.type(within(createDialog).getByLabelText('Amount'), '1234.50')
    await user.type(within(createDialog).getByLabelText('Payee'), 'Stone & Co')
    await user.click(within(createDialog).getByRole('button', { name: 'Add expense' }))

    expect(await screen.findByText('Kitchen worktop')).toBeInTheDocument()
    const posted = apiCalls.find((call) => call.method === 'POST')
    expect(posted?.body).toMatchObject({ amount: '1234.50', description: 'Kitchen worktop' })

    // --- Filter -------------------------------------------------------------
    await user.click(screen.getByRole('button', { name: 'Add expense' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.selectOptions(screen.getByLabelText('Status'), 'planned')

    await waitFor(() => expect(screen.queryByText('Kitchen worktop')).not.toBeInTheDocument())
    expect(screen.getByText(/No expenses match the current filters/i)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Status'), 'all')
    expect(await screen.findByText('Kitchen worktop')).toBeInTheDocument()

    // --- Edit ---------------------------------------------------------------
    await user.click(screen.getByRole('button', { name: 'Edit Kitchen worktop' }))
    const editDialog = screen.getByRole('dialog')
    expect(editDialog).toHaveAccessibleName('Edit expense')

    const amount = within(editDialog).getByLabelText('Amount')
    await user.clear(amount)
    await user.type(amount, '999.00')
    await user.click(within(editDialog).getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const patched = apiCalls.find((call) => call.method === 'PATCH')
    expect(patched?.body).toEqual({ amount: '999.00' })

    // --- Delete -------------------------------------------------------------
    await user.click(screen.getByRole('button', { name: 'Delete Kitchen worktop' }))
    await user.click(screen.getByRole('button', { name: 'Delete expense' }))

    await waitFor(() => expect(screen.queryByText('Kitchen worktop')).not.toBeInTheDocument())
    expect(screen.getByText(/No expenses recorded yet/i)).toBeInTheDocument()
    expect(apiCalls.some((call) => call.method === 'DELETE' && call.path === '/expenses/exp-1')).toBe(
      true,
    )
  })

  it('sets a budget from the strip and shows the new remainder without a reload', async () => {
    const user = userEvent.setup()
    stubApi({
      'GET /expenses': { body: [WORKTOP] },
      'GET /budget': { body: aBudget({ planned_budget: null }) },
      'GET /budget/summary': [
        { body: aSummary({ planned_budget: null, remaining_budget: null }) },
        { body: aSummary({ planned_budget: '50000.00', remaining_budget: '48765.50' }) },
      ],
      'PUT /budget': { body: aBudget({ planned_budget: '50000.00' }) },
    })

    render(<ExpensesScreen />)
    await screenReady()
    expect(await screen.findByText(/No budget is set yet/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit budget' }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Planned budget'), '50000.00')
    await user.click(within(dialog).getByRole('button', { name: 'Save budget' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Remaining budget')).toBeInTheDocument()
    expect(screen.queryByText(/No budget is set yet/i)).not.toBeInTheDocument()

    const put = apiCalls.find((call) => call.method === 'PUT')
    expect(put?.body).toMatchObject({ planned_budget: '50000.00' })
  })

  it('shows exactly one accent button, even with nothing recorded', async () => {
    stubApi({
      'GET /expenses': { body: [] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary({ expense_count: 0 }) },
    })

    render(<ExpensesScreen />)
    await screenReady()

    const accents = screen
      .getAllByRole('button')
      .filter((button) => button.className.includes('bg-accent'))

    expect(accents).toHaveLength(1)
  })

  it('recovers from a failed list without a page reload', async () => {
    const user = userEvent.setup()
    stubApi({
      'GET /expenses': [
        { status: 503, body: { detail: 'Service unavailable' } },
        { body: [WORKTOP] },
      ],
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
    })

    render(<ExpensesScreen />)

    expect(await screen.findByText('Service unavailable')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Kitchen worktop')).toBeInTheDocument()
    expect(screen.queryByText('Service unavailable')).not.toBeInTheDocument()
  })

  it('keeps the table usable when the summary request fails', async () => {
    stubApi({
      'GET /expenses': { body: [WORKTOP] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { status: 500, body: { detail: 'Summary exploded' } },
    })

    render(<ExpensesScreen />)

    expect(await screen.findByText('Summary exploded')).toBeInTheDocument()
    expect(screen.getByText('Kitchen worktop')).toBeInTheDocument()
  })
})
