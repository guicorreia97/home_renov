import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLocale } from '../../test/renderWithLocale'
import { ExpenseFilters } from './ExpenseFilters'
import type { ExpenseFilters as ExpenseFiltersValue } from './formTypes'

const ALL: ExpenseFiltersValue = { status: 'all', category: 'all' }

describe('ExpenseFilters', () => {
  it('defaults to showing everything', () => {
    const { t } = renderWithLocale(<ExpenseFilters filters={ALL} onChange={vi.fn()} />)

    expect(screen.getByLabelText(t('expense.field.status'))).toHaveValue('all')
    expect(screen.getByLabelText(t('expense.field.category'))).toHaveValue('all')
  })

  it('offers an explicit "all" option in both filters', () => {
    const { t } = renderWithLocale(<ExpenseFilters filters={ALL} onChange={vi.fn()} />)

    expect(screen.getByRole('option', { name: t('expenses.filter.allStatuses') })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: t('expenses.filter.allCategories') })).toBeInTheDocument()
  })

  it('reports a status change without disturbing the category', async () => {
    const onChange = vi.fn()
    const { t } = renderWithLocale(<ExpenseFilters filters={ALL} onChange={onChange} />)

    await userEvent.selectOptions(screen.getByLabelText(t('expense.field.status')), 'paid')

    expect(onChange).toHaveBeenCalledWith({ status: 'paid', category: 'all' })
  })

  it('reports a category change without disturbing the status', async () => {
    const onChange = vi.fn()
    const { t } = renderWithLocale(
      <ExpenseFilters filters={{ status: 'paid', category: 'all' }} onChange={onChange} />,
    )

    await userEvent.selectOptions(screen.getByLabelText(t('expense.field.category')), 'materials')

    expect(onChange).toHaveBeenCalledWith({ status: 'paid', category: 'materials' })
  })

  it('reflects the filters it is given', () => {
    const { t } = renderWithLocale(
      <ExpenseFilters filters={{ status: 'planned', category: 'labour' }} onChange={vi.fn()} />,
    )

    expect(screen.getByLabelText(t('expense.field.status'))).toHaveValue('planned')
    expect(screen.getByLabelText(t('expense.field.category'))).toHaveValue('labour')
  })

  it('renders category and status options with their Portuguese label, while keeping the machine value', () => {
    const { t } = renderWithLocale(<ExpenseFilters filters={ALL} onChange={vi.fn()} />, 'pt-PT')

    expect(screen.getByLabelText(t('expense.field.status'))).toBeInTheDocument()
    expect(screen.getByLabelText(t('expense.field.category'))).toBeInTheDocument()
    expect(screen.getByRole('option', { name: t('expenses.filter.allStatuses') })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: t('expenses.filter.allCategories') })).toBeInTheDocument()

    const materiais = screen.getByRole('option', {
      name: t('expense.category.materials'),
    }) as HTMLOptionElement
    expect(materiais.value).toBe('materials')

    const pago = screen.getByRole('option', { name: t('expense.status.paid') }) as HTMLOptionElement
    expect(pago.value).toBe('paid')
  })
})
