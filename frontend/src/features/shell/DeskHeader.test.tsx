import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatMoney } from '../../lib/format'
import { aSummary } from '../../test/fixtures'
import { folded, renderWithLocale } from '../../test/renderWithLocale'
import { DeskHeader } from './DeskHeader'

describe('DeskHeader', () => {
  it('never renders an unset assumption as zero, and shows no over-budget pill without a budget', () => {
    const summary = aSummary({ purchase_price: null, planned_budget: null, target_sale_price: '260000.00' })
    const { t } = renderWithLocale(
      <DeskHeader
        summary={summary}
        summaryLoading={false}
        summaryError={null}
        budgetLoading={false}
        budgetError={null}
        onRecordExpense={() => {}}
        onEditTargets={() => {}}
      />,
    )

    const unsetLabels = screen.getAllByText(t('shell.header.assumptionUnset'))
    expect(unsetLabels).toHaveLength(2)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText(t('shell.header.overBudgetPill'))).not.toBeInTheDocument()
    expect(screen.queryByText(t('shell.header.withinBudgetPill'))).not.toBeInTheDocument()
  })

  it('shows every assumption once the budget is fully set, plus the within-budget pill', () => {
    const summary = aSummary({ over_budget: false })
    const { t } = renderWithLocale(
      <DeskHeader
        summary={summary}
        summaryLoading={false}
        summaryError={null}
        budgetLoading={false}
        budgetError={null}
        onRecordExpense={() => {}}
        onEditTargets={() => {}}
      />,
    )

    expect(
      screen.getByText(folded(formatMoney(summary.purchase_price!, summary.currency, 'en'))),
    ).toBeInTheDocument()
    expect(
      screen.getByText(folded(formatMoney(summary.planned_budget!, summary.currency, 'en'))),
    ).toBeInTheDocument()
    expect(screen.getByText(t('shell.header.withinBudgetPill'))).toBeInTheDocument()
  })

  it('shows the over-budget pill when the API reports the budget exceeded', () => {
    const summary = aSummary({ over_budget: true })
    const { t } = renderWithLocale(
      <DeskHeader
        summary={summary}
        summaryLoading={false}
        summaryError={null}
        budgetLoading={false}
        budgetError={null}
        onRecordExpense={() => {}}
        onEditTargets={() => {}}
      />,
    )

    expect(screen.getByText(t('shell.header.overBudgetPill'))).toBeInTheDocument()
  })

  it('opens the expense form and the targets editor from its two actions', async () => {
    const user = userEvent.setup()
    const onRecordExpense = vi.fn()
    const onEditTargets = vi.fn()
    const { t } = renderWithLocale(
      <DeskHeader
        summary={aSummary()}
        summaryLoading={false}
        summaryError={null}
        budgetLoading={false}
        budgetError={null}
        onRecordExpense={onRecordExpense}
        onEditTargets={onEditTargets}
      />,
    )

    await user.click(screen.getByRole('button', { name: t('expenses.add') }))
    expect(onRecordExpense).toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: t('shell.header.editTargets') }))
    expect(onEditTargets).toHaveBeenCalled()
  })
})
