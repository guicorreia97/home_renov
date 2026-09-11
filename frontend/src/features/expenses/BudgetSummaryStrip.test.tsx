import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { en, pt } from '../../i18n'
import type { Locale, MessageKey } from '../../i18n'
import { formatMoney, formatPercent } from '../../lib/format'
import { aSummary } from '../../test/fixtures'
import { folded, renderWithLocale } from '../../test/renderWithLocale'
import { BudgetSummaryStrip } from './BudgetSummaryStrip'

function renderStrip(
  props: Partial<Parameters<typeof BudgetSummaryStrip>[0]> = {},
  locale: Locale = 'en',
) {
  const onEditBudget = vi.fn()
  const { t } = renderWithLocale(
    <BudgetSummaryStrip
      summary={aSummary()}
      summaryLoading={false}
      summaryError={null}
      budgetLoading={false}
      budgetError={null}
      onEditBudget={onEditBudget}
      {...props}
    />,
    locale,
  )
  return { onEditBudget, t }
}

/** The conclusion renders label, then amount, then the bar — not a dt/dd pair. */
function amountFor(label: string): Element | null | undefined {
  return screen.getByText(label).parentElement?.nextElementSibling
}

function barFill(): Element | undefined {
  return Array.from(document.querySelectorAll('div[aria-hidden="true"] > div')).at(0)
}

describe('BudgetSummaryStrip', () => {
  it('shows the headline figures', () => {
    const { t } = renderStrip()

    expect(screen.getByText(t('budget.summary.expensesRecorded'))).toBeInTheDocument()
    expect(screen.getByText(t('budget.summary.totalPaid'))).toBeInTheDocument()
    expect(screen.getByText(t('budget.summary.totalForecast'))).toBeInTheDocument()
  })

  it('shows the remaining budget in the success tone when under budget', () => {
    const { t } = renderStrip({
      summary: aSummary({ remaining_budget: '48765.50', over_budget: false, budget_used_percent: 2.5 }),
    })

    expect(screen.getByText(t('budget.summary.remaining'))).toBeInTheDocument()
    expect(amountFor(t('budget.summary.remaining'))?.className).toContain('text-success')
  })

  it('switches to the over-budget label in the danger tone when over', () => {
    const { t } = renderStrip({
      summary: aSummary({ remaining_budget: '-500.00', over_budget: true, budget_used_percent: 101 }),
    })

    expect(screen.queryByText(t('budget.summary.remaining'))).not.toBeInTheDocument()
    expect(amountFor(t('budget.summary.overBudget'))?.className).toContain('text-danger')
  })

  it('states the percentage of the budget used, which the API computed all along', () => {
    const { t } = renderStrip({ summary: aSummary({ budget_used_percent: 4.22 }) })

    expect(
      screen.getByText(folded(t('budget.remaining.percentUsed', { percent: formatPercent(4.22, 'en') }))),
    ).toBeInTheDocument()
  })

  it('fills the bar to the percentage used, in the matching tone', () => {
    renderStrip({ summary: aSummary({ budget_used_percent: 42, over_budget: false }) })

    const fill = barFill()
    expect(fill).toHaveStyle({ width: '42%' })
    expect(fill?.className).toContain('bg-success')
  })

  it('warns from 80%, while there is still room', () => {
    renderStrip({ summary: aSummary({ budget_used_percent: 85, over_budget: false }) })

    expect(barFill()?.className).toContain('bg-warning')
  })

  it('turns red from 90%, before the budget is actually gone', () => {
    const { t } = renderStrip({ summary: aSummary({ budget_used_percent: 90, over_budget: false }) })

    const fill = barFill()
    expect(fill?.className).toContain('bg-danger')
    expect(fill?.className).not.toContain('bg-warning')
    expect(amountFor(t('budget.summary.remaining'))?.className).toContain('text-danger')
  })

  it('stays merely warning just below 90%', () => {
    renderStrip({ summary: aSummary({ budget_used_percent: 89.9, over_budget: false }) })

    expect(barFill()?.className).toContain('bg-warning')
  })

  it('caps the bar at full when spend has run past the budget', () => {
    renderStrip({
      summary: aSummary({ budget_used_percent: 240, over_budget: true, remaining_budget: '-70000.00' }),
    })

    const fill = barFill()
    expect(fill).toHaveStyle({ width: '100%' })
    expect(fill?.className).toContain('bg-danger')
  })

  it('never paints the bar with the accent, which belongs to the primary action', () => {
    renderStrip({ summary: aSummary({ budget_used_percent: 42 }) })

    expect(barFill()?.className).not.toContain('accent')
  })

  it('still shows the remaining figure when the API sends no percentage', () => {
    const { t } = renderStrip({ summary: aSummary({ budget_used_percent: null }) })

    expect(screen.getByText(t('budget.summary.remaining'))).toBeInTheDocument()
    // The sentence's fixed words come from the catalogue, so a reword cannot
    // quietly turn this into an assertion that always passes.
    const fixedWords = t('budget.remaining.percentUsed').replace('{percent}', '').trim()
    expect(fixedWords).not.toBe('')
    expect(document.body.textContent).not.toContain(fixedWords)
  })

  it('shows no conclusion at all when there is no budget to conclude against', () => {
    const { t } = renderStrip({
      summary: aSummary({ planned_budget: null, remaining_budget: null, budget_used_percent: null }),
    })

    expect(screen.queryByText(t('budget.summary.remaining'))).not.toBeInTheDocument()
    expect(barFill()).toBeUndefined()
  })

  it('tells the user what to do when no budget is set, instead of showing a blank', () => {
    const { t } = renderStrip({ summary: aSummary({ planned_budget: null, remaining_budget: null }) })

    expect(screen.queryByText(t('budget.summary.remaining'))).not.toBeInTheDocument()
    // A real sentence naming the next action, not "No data".
    expect(
      screen.getByText(t('budget.summary.emptyState', { action: t('budget.summary.edit') })),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('budget.summary.edit') })).toBeEnabled()
    // The spend totals still mean something without a budget.
    expect(screen.getByText(t('budget.summary.totalPaid'))).toBeInTheDocument()
  })

  it('opens the budget editor from a ghost trigger, leaving the accent to "Add expense"', async () => {
    const { onEditBudget, t } = renderStrip()
    const trigger = screen.getByRole('button', { name: t('budget.summary.edit') })

    await userEvent.click(trigger)

    expect(onEditBudget).toHaveBeenCalledOnce()
    expect(trigger.className).not.toContain('bg-accent')
  })

  it('shows the planned budget itself, not just what is left of it', () => {
    const { t } = renderStrip({ summary: aSummary({ planned_budget: '100000.00' }) })

    // The defect this replaced: the user could only infer their own budget by
    // adding the remainder to the forecast.
    const planned = screen.getByText(t('budget.field.plannedBudget')).nextElementSibling
    expect(folded(planned?.textContent ?? '')).toBe(folded(formatMoney('100000.00', 'EUR', 'en')))
  })

  it('shows the targets the modal can edit, so none of them is write-only', () => {
    const { t } = renderStrip()

    for (const key of ['budget.field.plannedBudget', 'budget.field.purchasePrice', 'budget.field.targetSalePrice'] as const) {
      expect(screen.getByText(t(key))).toBeInTheDocument()
    }
  })

  it('separates the targets from the spend under their own headings', () => {
    const { t } = renderStrip()

    expect(screen.getByText(t('budget.summary.targetsHeading'))).toBeInTheDocument()
    expect(screen.getByText(t('budget.summary.spendHeading'))).toBeInTheDocument()
  })

  it('renders an unset target as a dash, never blank or "null"', () => {
    const { t } = renderStrip({
      summary: aSummary({ purchase_price: null, target_sale_price: null, projected_profit: null }),
    })

    const purchase = screen.getByText(t('budget.field.purchasePrice')).nextElementSibling
    expect(purchase).toHaveTextContent('—')
    expect(purchase?.className).toContain('text-faint')
    expect(screen.queryByText('null')).not.toBeInTheDocument()
  })

  it('keeps a positive projected profit off the success colour', () => {
    const { t } = renderStrip({ summary: aSummary({ projected_profit: '78765.50' }) })

    // The guide reserves status colours for status: "never use --success merely
    // because a thing is positive".
    const profit = screen.getByText(t('budget.summary.projectedProfit')).nextElementSibling
    expect(profit?.className).toContain('text-text')
    expect(profit?.className).not.toContain('text-success')
  })

  it('shows a loading line while the summary is still in flight', () => {
    const { t } = renderStrip({ summary: null, summaryLoading: true })

    expect(screen.getByText(t('budget.summary.loadingSummary'))).toBeInTheDocument()
  })

  it('keeps showing the last figures while a refresh is in flight', () => {
    const { t } = renderStrip({ summaryLoading: true })

    expect(screen.queryByText(t('budget.summary.loadingSummary'))).not.toBeInTheDocument()
    expect(screen.getByText(t('budget.summary.totalPaid'))).toBeInTheDocument()
  })

  it('reports a network failure without hiding the budget trigger', () => {
    const { t } = renderStrip({ summary: null, summaryError: 'network' })

    expect(screen.getByText(t('budget.error.network'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('budget.summary.edit') })).toBeInTheDocument()
  })

  it('reports a server failure with different copy from a network failure', () => {
    const { t } = renderStrip({ summary: null, summaryError: 'server' })

    expect(screen.getByText(t('budget.error.server'))).toBeInTheDocument()
    expect(screen.queryByText(t('budget.error.network'))).not.toBeInTheDocument()
  })

  it('disables the trigger while the budget itself is loading or failed', () => {
    const { unmount, t } = renderWithLocale(
      <BudgetSummaryStrip
        summary={aSummary()}
        summaryLoading={false}
        summaryError={null}
        budgetLoading
        budgetError={null}
        onEditBudget={vi.fn()}
      />,
      'en',
    )
    expect(screen.getByRole('button', { name: t('budget.summary.edit') })).toBeDisabled()
    unmount()

    const { t: t2 } = renderStrip({ budgetError: 'server' })

    expect(screen.getByRole('button', { name: t2('budget.summary.edit') })).toBeDisabled()
    expect(screen.getByText(t2('budget.error.server'))).toBeInTheDocument()
  })

  it('states an empty budget in Portuguese, with no English left in the strip', () => {
    const { t } = renderStrip(
      { summary: aSummary({ planned_budget: null, remaining_budget: null, budget_used_percent: null }) },
      'pt-PT',
    )

    expect(
      screen.getByText(t('budget.summary.emptyState', { action: t('budget.summary.edit') })),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('budget.summary.edit') })).toBeEnabled()
    // No zero percentage or zero amount stands in for the missing figures.
    expect(screen.queryByText(t('budget.summary.remaining'))).not.toBeInTheDocument()
    expect(
      screen.queryByText(folded(t('budget.remaining.percentUsed', { percent: formatPercent(0, 'pt-PT') }))),
    ).not.toBeInTheDocument()

    const strip = screen.getByRole('region', { name: t('budget.summary.label') })
    const englishOnly = new Set(
      (Object.keys(en) as MessageKey[]).filter((key) => en[key] !== pt[key]).map((key): string => en[key]),
    )
    const walker = document.createTreeWalker(strip, NodeFilter.SHOW_TEXT)
    const leftovers: string[] = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim()
      if (text && englishOnly.has(text)) leftovers.push(text)
    }
    expect(leftovers).toEqual([])
  })

  it('formats the budget-used percentage per locale, via the catalogue', () => {
    const { t } = renderStrip({ summary: aSummary({ budget_used_percent: 4.22 }) }, 'pt-PT')

    expect(
      screen.getByText(folded(t('budget.remaining.percentUsed', { percent: formatPercent(4.22, 'pt-PT') }))),
    ).toBeInTheDocument()
  })

  it('formats money figures per locale, via useFormat', () => {
    const { t } = renderStrip({ summary: aSummary({ total_paid: '1234.50' }) }, 'pt-PT')

    const totalPaid = screen.getByText(t('budget.summary.totalPaid')).nextElementSibling
    expect(folded(totalPaid?.textContent ?? '')).toBe(folded(formatMoney('1234.50', 'EUR', 'pt-PT')))
  })
})
