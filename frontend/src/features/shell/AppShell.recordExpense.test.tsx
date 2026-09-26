import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { aBudget, aSummary, anExpense } from '../../test/fixtures'
import { renderWithLocale } from '../../test/renderWithLocale'
import { stubApi } from '../../test/setup'
import { AppShell } from './AppShell'

const WORKTOP = anExpense({ id: 'exp-1', description: 'Kitchen worktop' })

/**
 * Covers the two findings fixed alongside the shell's single
 * `useExpensesData()` call: the header's own "add expense" action must land
 * its row in the ledger table already on screen (not just refresh totals
 * elsewhere), and the ledger view must carry exactly one control by that
 * name once the header owns the action.
 */
describe('AppShell — the header is the one place that records an expense', () => {
  it('adding an expense from the header action shows the new row in the ledger table already on screen', async () => {
    const user = userEvent.setup()
    stubApi({
      'GET /expenses': [{ body: [] }, { body: [WORKTOP] }],
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
      'POST /expenses': { body: WORKTOP },
    })

    const { t } = renderWithLocale(<AppShell />)
    await screen.findByText(t('expenses.table.empty'))

    // Two controls share this name before anything is recorded: the header's
    // and the empty ledger's own "add the first one" CTA. The header's is
    // first in DOM order.
    const [headerAdd] = screen.getAllByRole('button', { name: t('expenses.add') })
    await user.click(headerAdd)

    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(t('expense.field.description')), 'Kitchen worktop')
    await user.type(within(dialog).getByLabelText(t('expense.field.amount')), '1234.50')
    await user.type(within(dialog).getByLabelText(t('expense.field.payee')), 'Stone & Co')
    await user.click(within(dialog).getByRole('button', { name: t('expenses.add') }))

    // The exact case the review reproduced: the row lands in the ledger
    // table already on screen, not only in the sidebar/header totals.
    const row = (await screen.findByText('Kitchen worktop')).closest('tr')
    expect(row).not.toBeNull()
  })

  it('renders exactly one add-expense control with the shell mounted and the ledger tab active', async () => {
    stubApi({
      'GET /expenses': { body: [WORKTOP] },
      'GET /budget': { body: aBudget() },
      'GET /budget/summary': { body: aSummary() },
    })

    const { t } = renderWithLocale(<AppShell />)
    await screen.findByText('Kitchen worktop')

    expect(screen.getAllByRole('button', { name: t('expenses.add') })).toHaveLength(1)
  })
})
