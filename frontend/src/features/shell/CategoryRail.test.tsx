import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatMoney, formatPercent } from '../../lib/format'
import { aSummary } from '../../test/fixtures'
import { folded, renderWithLocale } from '../../test/renderWithLocale'
import { CategoryRail } from './CategoryRail'

const TWO_CATEGORY_SUMMARY = aSummary({
  by_category: [
    { category: 'materials', amount: '900.00', planned: '0.00', pending: '0.00', paid: '900.00', share: 75 },
    { category: 'labour', amount: '300.00', planned: '0.00', pending: '0.00', paid: '300.00', share: 25 },
    { category: 'utilities', amount: '0.00', planned: '50.00', pending: '0.00', paid: '0.00', share: 0 },
  ],
})

describe('CategoryRail', () => {
  it('lists every category with committed spend, its total and its share, ordered by share', async () => {
    const { t } = renderWithLocale(
      <CategoryRail
        summary={TWO_CATEGORY_SUMMARY}
        summaryLoading={false}
        summaryError={null}
        selectedCategory="all"
        onSelectCategory={() => {}}
        onClearCategory={() => {}}
      />,
    )

    const materialsRow = screen.getByRole('button', { name: t('expense.category.materials') })
    const labourRow = screen.getByRole('button', { name: t('expense.category.labour') })
    // Ordered by share of spend, highest first.
    expect(materialsRow.compareDocumentPosition(labourRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    expect(
      screen.getByText(folded(formatMoney('900.00', TWO_CATEGORY_SUMMARY.currency, 'en'))),
    ).toBeInTheDocument()
    expect(screen.getByText(folded(formatPercent(75, 'en')))).toBeInTheDocument()

    // A category with no committed spend (share 0) is not listed — the rail
    // is never labelled for works phases, and utilities never appears here.
    expect(screen.queryByRole('button', { name: t('expense.category.utilities') })).not.toBeInTheDocument()
  })

  it('marks the selected row and sets the category on click, never a second filter mechanism', async () => {
    const user = userEvent.setup()
    const onSelectCategory = vi.fn()
    const { t } = renderWithLocale(
      <CategoryRail
        summary={TWO_CATEGORY_SUMMARY}
        summaryLoading={false}
        summaryError={null}
        selectedCategory="materials"
        onSelectCategory={onSelectCategory}
        onClearCategory={() => {}}
      />,
    )

    const materialsRow = screen.getByRole('button', { name: t('expense.category.materials') })
    expect(materialsRow).toHaveAttribute('aria-pressed', 'true')

    const labourRow = screen.getByRole('button', { name: t('expense.category.labour') })
    expect(labourRow).toHaveAttribute('aria-pressed', 'false')

    await user.click(labourRow)
    expect(onSelectCategory).toHaveBeenCalledWith('labour')
  })

  it('clears the filter from the clear action, disabled when nothing is selected', async () => {
    const user = userEvent.setup()
    const onClearCategory = vi.fn()
    const { t, rerender } = renderWithLocale(
      <CategoryRail
        summary={TWO_CATEGORY_SUMMARY}
        summaryLoading={false}
        summaryError={null}
        selectedCategory="all"
        onSelectCategory={() => {}}
        onClearCategory={onClearCategory}
      />,
    )

    expect(screen.getByRole('button', { name: t('shell.sidebar.clearFilter') })).toBeDisabled()

    rerender(
      <CategoryRail
        summary={TWO_CATEGORY_SUMMARY}
        summaryLoading={false}
        summaryError={null}
        selectedCategory="materials"
        onSelectCategory={() => {}}
        onClearCategory={onClearCategory}
      />,
    )

    const clearButton = screen.getByRole('button', { name: t('shell.sidebar.clearFilter') })
    expect(clearButton).toBeEnabled()
    await user.click(clearButton)
    expect(onClearCategory).toHaveBeenCalled()
  })

  it('states that nothing has been spent yet rather than rendering an empty list', () => {
    const { t } = renderWithLocale(
      <CategoryRail
        summary={aSummary({ by_category: [] })}
        summaryLoading={false}
        summaryError={null}
        selectedCategory="all"
        onSelectCategory={() => {}}
        onClearCategory={() => {}}
      />,
    )

    expect(screen.getByText(t('shell.sidebar.empty'))).toBeInTheDocument()
  })

  it('shows a loading state before the summary arrives, and an error when it fails', () => {
    const { t, rerender } = renderWithLocale(
      <CategoryRail
        summary={null}
        summaryLoading={true}
        summaryError={null}
        selectedCategory="all"
        onSelectCategory={() => {}}
        onClearCategory={() => {}}
      />,
    )
    expect(screen.getByText(t('shell.sidebar.loading'))).toBeInTheDocument()

    rerender(
      <CategoryRail
        summary={null}
        summaryLoading={false}
        summaryError="server"
        selectedCategory="all"
        onSelectCategory={() => {}}
        onClearCategory={() => {}}
      />,
    )
    expect(screen.getByText(t('budget.error.server'))).toBeInTheDocument()
  })
})
