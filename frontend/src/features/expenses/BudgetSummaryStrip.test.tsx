import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { aSummary } from '../../test/fixtures'
import { BudgetSummaryStrip } from './BudgetSummaryStrip'

function renderStrip(props: Partial<Parameters<typeof BudgetSummaryStrip>[0]> = {}) {
  const onEditBudget = vi.fn()
  render(
    <BudgetSummaryStrip
      summary={aSummary()}
      summaryLoading={false}
      summaryError={null}
      budgetLoading={false}
      budgetError={null}
      onEditBudget={onEditBudget}
      {...props}
    />,
  )
  return { onEditBudget }
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
    renderStrip()

    expect(screen.getByText('Expenses recorded')).toBeInTheDocument()
    expect(screen.getByText('Total paid')).toBeInTheDocument()
    expect(screen.getByText('Total forecast')).toBeInTheDocument()
  })

  it('shows the remaining budget in the success tone when under budget', () => {
    renderStrip({
      summary: aSummary({ remaining_budget: '48765.50', over_budget: false, budget_used_percent: 2.5 }),
    })

    expect(screen.getByText('Remaining budget')).toBeInTheDocument()
    expect(amountFor('Remaining budget')?.className).toContain('text-success')
  })

  it('switches to "Over budget by" in the danger tone when over', () => {
    renderStrip({
      summary: aSummary({ remaining_budget: '-500.00', over_budget: true, budget_used_percent: 101 }),
    })

    expect(screen.queryByText('Remaining budget')).not.toBeInTheDocument()
    expect(amountFor('Over budget by')?.className).toContain('text-danger')
  })

  it('states the percentage of the budget used, which the API computed all along', () => {
    renderStrip({ summary: aSummary({ budget_used_percent: 4.22 }) })

    expect(screen.getByText('4.2% of budget used')).toBeInTheDocument()
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
    renderStrip({ summary: aSummary({ budget_used_percent: 90, over_budget: false }) })

    const fill = barFill()
    expect(fill?.className).toContain('bg-danger')
    expect(fill?.className).not.toContain('bg-warning')
    expect(amountFor('Remaining budget')?.className).toContain('text-danger')
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
    renderStrip({ summary: aSummary({ budget_used_percent: null }) })

    expect(screen.getByText('Remaining budget')).toBeInTheDocument()
    expect(screen.queryByText(/of budget used/)).not.toBeInTheDocument()
  })

  it('shows no conclusion at all when there is no budget to conclude against', () => {
    renderStrip({
      summary: aSummary({ planned_budget: null, remaining_budget: null, budget_used_percent: null }),
    })

    expect(screen.queryByText('Remaining budget')).not.toBeInTheDocument()
    expect(barFill()).toBeUndefined()
  })

  it('tells the user what to do when no budget is set, instead of showing a blank', () => {
    renderStrip({ summary: aSummary({ planned_budget: null, remaining_budget: null }) })

    expect(screen.queryByText('Remaining budget')).not.toBeInTheDocument()
    // A real sentence naming the next action, not "No data".
    expect(screen.getByText(/No budget is set yet/i)).toHaveTextContent('Edit budget')
    expect(screen.getByRole('button', { name: 'Edit budget' })).toBeEnabled()
    // The spend totals still mean something without a budget.
    expect(screen.getByText('Total paid')).toBeInTheDocument()
  })

  it('opens the budget editor from a ghost trigger, leaving the accent to "Add expense"', async () => {
    const { onEditBudget } = renderStrip()
    const trigger = screen.getByRole('button', { name: 'Edit budget' })

    await userEvent.click(trigger)

    expect(onEditBudget).toHaveBeenCalledOnce()
    expect(trigger.className).not.toContain('bg-accent')
  })

  it('shows the planned budget itself, not just what is left of it', () => {
    renderStrip({ summary: aSummary({ planned_budget: '100000.00' }) })

    // The defect this replaced: the user could only infer their own budget by
    // adding the remainder to the forecast.
    const planned = screen.getByText('Planned budget').nextElementSibling
    expect(planned?.textContent).toMatch(/100[.,\s]?000[.,]00/)
  })

  it('shows the targets the modal can edit, so none of them is write-only', () => {
    renderStrip()

    for (const label of ['Planned budget', 'Purchase price', 'Target sale price']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('separates the targets from the spend under their own headings', () => {
    renderStrip()

    expect(screen.getByText('Targets')).toBeInTheDocument()
    expect(screen.getByText('Spend')).toBeInTheDocument()
  })

  it('renders an unset target as a dash, never blank or "null"', () => {
    renderStrip({
      summary: aSummary({ purchase_price: null, target_sale_price: null, projected_profit: null }),
    })

    const purchase = screen.getByText('Purchase price').nextElementSibling
    expect(purchase).toHaveTextContent('—')
    expect(purchase?.className).toContain('text-faint')
    expect(screen.queryByText('null')).not.toBeInTheDocument()
  })

  it('keeps a positive projected profit off the success colour', () => {
    renderStrip({ summary: aSummary({ projected_profit: '78765.50' }) })

    // The guide reserves status colours for status: "never use --success merely
    // because a thing is positive".
    const profit = screen.getByText('Projected profit').nextElementSibling
    expect(profit?.className).toContain('text-text')
    expect(profit?.className).not.toContain('text-success')
  })

  it('shows a loading line while the summary is still in flight', () => {
    renderStrip({ summary: null, summaryLoading: true })

    expect(screen.getByText('Loading summary…')).toBeInTheDocument()
  })

  it('keeps showing the last figures while a refresh is in flight', () => {
    renderStrip({ summaryLoading: true })

    expect(screen.queryByText('Loading summary…')).not.toBeInTheDocument()
    expect(screen.getByText('Total paid')).toBeInTheDocument()
  })

  it('reports a failed summary without hiding the budget trigger', () => {
    renderStrip({ summary: null, summaryError: 'Summary exploded' })

    expect(screen.getByText('Summary exploded')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit budget' })).toBeInTheDocument()
  })

  it('disables the trigger while the budget itself is loading or failed', () => {
    const { unmount } = render(
      <BudgetSummaryStrip
        summary={aSummary()}
        summaryLoading={false}
        summaryError={null}
        budgetLoading
        budgetError={null}
        onEditBudget={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Edit budget' })).toBeDisabled()
    unmount()

    renderStrip({ budgetError: 'Could not load the budget' })

    expect(screen.getByRole('button', { name: 'Edit budget' })).toBeDisabled()
    expect(screen.getByText('Could not load the budget')).toBeInTheDocument()
  })
})
