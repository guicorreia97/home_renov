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

describe('BudgetSummaryStrip', () => {
  it('shows the headline figures', () => {
    renderStrip()

    expect(screen.getByText('Expenses recorded')).toBeInTheDocument()
    expect(screen.getByText('Total paid')).toBeInTheDocument()
    expect(screen.getByText('Total forecast')).toBeInTheDocument()
  })

  it('shows the remaining budget in the success tone when under budget', () => {
    renderStrip({
      summary: aSummary({ remaining_budget: '48765.50', over_budget: false }),
    })

    const figure = screen.getByText('Remaining budget').nextElementSibling
    expect(figure?.className).toContain('text-success')
  })

  it('switches to "Over budget by" in the danger tone when over', () => {
    renderStrip({ summary: aSummary({ remaining_budget: '-500.00', over_budget: true }) })

    expect(screen.queryByText('Remaining budget')).not.toBeInTheDocument()
    const figure = screen.getByText('Over budget by').nextElementSibling
    expect(figure?.className).toContain('text-danger')
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
