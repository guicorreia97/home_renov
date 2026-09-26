import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatMoney, formatPercent } from '../../lib/format'
import { aSummary } from '../../test/fixtures'
import { folded, renderWithLocale } from '../../test/renderWithLocale'
import { SidebarFooter } from './SidebarFooter'

describe('SidebarFooter', () => {
  it('states that no budget is set and offers the action that sets one, never a zero or a blank', async () => {
    const user = userEvent.setup()
    const onSetBudget = vi.fn()
    const { t } = renderWithLocale(
      <SidebarFooter
        summary={aSummary({ planned_budget: null, remaining_budget: null })}
        summaryLoading={false}
        onSetBudget={onSetBudget}
      />,
    )

    expect(screen.getByText(t('shell.sidebar.footer.noBudget'))).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: t('budget.summary.edit') }))
    expect(onSetBudget).toHaveBeenCalled()
  })

  it('shows a loading state before the summary arrives, distinct from the no-budget state', () => {
    const { t } = renderWithLocale(<SidebarFooter summary={null} summaryLoading={true} onSetBudget={() => {}} />)

    expect(screen.getByText(t('budget.summary.loadingSummary'))).toBeInTheDocument()
    expect(screen.queryByText(t('shell.sidebar.footer.noBudget'))).not.toBeInTheDocument()
  })

  it('shows the remaining budget and the percent used when a budget is set', () => {
    const summary = aSummary({
      planned_budget: '50000.00',
      remaining_budget: '48765.50',
      budget_used_percent: 2.47,
      over_budget: false,
    })
    const { t } = renderWithLocale(<SidebarFooter summary={summary} summaryLoading={false} onSetBudget={() => {}} />)

    expect(screen.getByText(t('budget.summary.remaining'))).toBeInTheDocument()
    expect(screen.getByText(folded(formatMoney('48765.50', summary.currency, 'en')))).toBeInTheDocument()
    expect(
      screen.getByText(folded(t('budget.remaining.percentUsed', { percent: formatPercent(2.47, 'en') }))),
    ).toBeInTheDocument()
  })

  it('shows the over-budget label and figure when the API reports the budget exceeded', () => {
    const summary = aSummary({
      planned_budget: '50000.00',
      remaining_budget: '-500.00',
      budget_used_percent: 101,
      over_budget: true,
    })
    const { t } = renderWithLocale(<SidebarFooter summary={summary} summaryLoading={false} onSetBudget={() => {}} />)

    expect(screen.getByText(t('budget.summary.overBudget'))).toBeInTheDocument()
    expect(screen.queryByText(t('budget.summary.remaining'))).not.toBeInTheDocument()
  })
})
