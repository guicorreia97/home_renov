import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatMoney, formatPercent } from '../../lib/format'
import { aSummary } from '../../test/fixtures'
import { folded, renderWithLocale } from '../../test/renderWithLocale'
import { ProfitView } from './ProfitView'

function renderView(props: Partial<Parameters<typeof ProfitView>[0]> = {}) {
  const onEditTargets = vi.fn()
  const result = renderWithLocale(
    <ProfitView summary={aSummary()} summaryLoading={false} summaryError={null} onEditTargets={onEditTargets} {...props} />,
  )
  return { onEditTargets, ...result }
}

describe('ProfitView', () => {
  it('shows the headline profit, margin and return on cost read straight from the summary', () => {
    const summary = aSummary({ projected_profit: '78765.50', margin_percent: 30.29, return_on_cost_percent: 43.46 })
    const { t } = renderView({ summary })

    expect(screen.getByText(t('budget.profit.margin'))).toBeInTheDocument()
    expect(screen.getByText(t('budget.profit.returnOnCost'))).toBeInTheDocument()
    expect(
      screen.getAllByText(folded(formatMoney('78765.50', summary.currency, 'en'))).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText(folded(formatPercent(30.29, 'en')))).toBeInTheDocument()
    expect(screen.getByText(folded(formatPercent(43.46, 'en')))).toBeInTheDocument()
  })

  it('shows the waterfall: target sale price, less purchase price, less forecast cost', () => {
    const summary = aSummary({
      target_sale_price: '260000.00',
      purchase_price: '180000.00',
      total_forecast: '1234.50',
    })
    const { t } = renderView({ summary })

    expect(screen.getByText(t('budget.field.targetSalePrice'))).toBeInTheDocument()
    expect(screen.getByText(t('budget.profit.less', { label: t('budget.field.purchasePrice') }))).toBeInTheDocument()
    expect(
      screen.getByText(t('budget.profit.less', { label: t('budget.summary.totalForecast') })),
    ).toBeInTheDocument()
  })

  it('shows the break-even sale price', () => {
    const summary = aSummary({ break_even_sale_price: '181234.50' })
    const { t } = renderView({ summary })

    expect(screen.getByText(t('budget.profit.breakEven'))).toBeInTheDocument()
    expect(screen.getByText(folded(formatMoney('181234.50', summary.currency, 'en')))).toBeInTheDocument()
  })

  it('never shows an unset purchase price as zero in the waterfall', () => {
    const summary = aSummary({ purchase_price: null })
    const { t } = renderView({ summary })

    expect(screen.getByText(t('shell.header.assumptionUnset'))).toBeInTheDocument()
    expect(screen.queryByText('€0.00')).not.toBeInTheDocument()
  })

  // 4.7 — no target sale price: states its emptiness, offers the action, and
  // shows no profit, margin or return figure in place of a zero.
  it('states the emptiness and offers to set a target when none is set, showing no profit, margin or return', async () => {
    const user = userEvent.setup()
    const summary = aSummary({
      target_sale_price: null,
      projected_profit: null,
      margin_percent: null,
      return_on_cost_percent: null,
    })
    const { onEditTargets, t } = renderView({ summary })

    expect(screen.getByText(t('budget.profit.noTarget'))).toBeInTheDocument()
    expect(screen.queryByText(t('budget.profit.margin'))).not.toBeInTheDocument()
    expect(screen.queryByText(t('budget.profit.returnOnCost'))).not.toBeInTheDocument()
    expect(screen.queryByText(t('budget.summary.projectedProfit'))).not.toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
    expect(screen.queryByText(folded(formatMoney('0.00', summary.currency, 'en')))).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: t('shell.header.editTargets') }))
    expect(onEditTargets).toHaveBeenCalledOnce()
  })

  it('still states the break-even price with no target sale price, since it needs no target', () => {
    const summary = aSummary({ target_sale_price: null, break_even_sale_price: '181234.50' })
    const { t } = renderView({ summary })

    expect(screen.getByText(t('budget.profit.noTarget'))).toBeInTheDocument()
    expect(screen.getByText(t('budget.profit.breakEven'))).toBeInTheDocument()
    expect(screen.getByText(folded(formatMoney('181234.50', summary.currency, 'en')))).toBeInTheDocument()
  })

  // 4.8 — a negative projected profit, in the danger colour, with its sign.
  it('renders a negative projected profit in the danger colour, with its sign, never as an absolute value', () => {
    const summary = aSummary({ projected_profit: '-4200.00', margin_percent: -12.5 })
    renderView({ summary })

    const figures = screen.getAllByText(folded(formatMoney('-4200.00', summary.currency, 'en')))
    expect(figures.length).toBeGreaterThan(0)
    for (const figure of figures) {
      expect(figure.className).toContain('text-danger')
    }
    // The sign survives formatting — never rendered as the positive amount.
    expect(screen.queryByText(folded(formatMoney('4200.00', summary.currency, 'en')))).not.toBeInTheDocument()
  })

  it('keeps a positive projected profit off both the success and danger colours', () => {
    const summary = aSummary({ projected_profit: '4200.00' })
    renderView({ summary })

    const figure = screen.getAllByText(/4,?200\.00/)[0]
    expect(figure.className).not.toContain('text-danger')
    expect(figure.className).not.toContain('text-success')
  })

  it('shows a loading line before the first summary arrives', () => {
    const { t } = renderView({ summary: null, summaryLoading: true })

    expect(screen.getByText(t('budget.summary.loadingSummary'))).toBeInTheDocument()
  })

  it('shows a failure instead of the projection, never the backend detail', () => {
    const { t } = renderView({ summary: null, summaryError: 'network' })

    expect(screen.getByText(t('budget.error.network'))).toBeInTheDocument()
  })

  it('renders the heading and the no-target sentence in Portuguese too', () => {
    const summary = aSummary({ target_sale_price: null })
    const { t } = renderWithLocale(
      <ProfitView summary={summary} summaryLoading={false} summaryError={null} onEditTargets={() => {}} />,
      'pt-PT',
    )

    expect(screen.getByRole('heading', { name: t('shell.tab.profit') })).toBeInTheDocument()
    expect(screen.getByText(t('budget.profit.noTarget'))).toBeInTheDocument()
  })
})
