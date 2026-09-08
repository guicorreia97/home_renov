import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExpenseFilters } from './ExpenseFilters'
import type { ExpenseFilters as ExpenseFiltersValue } from './formTypes'

const ALL: ExpenseFiltersValue = { status: 'all', category: 'all' }

describe('ExpenseFilters', () => {
  it('defaults to showing everything', () => {
    render(<ExpenseFilters filters={ALL} onChange={vi.fn()} />)

    expect(screen.getByLabelText('Status')).toHaveValue('all')
    expect(screen.getByLabelText('Category')).toHaveValue('all')
  })

  it('offers an explicit "all" option in both filters', () => {
    render(<ExpenseFilters filters={ALL} onChange={vi.fn()} />)

    expect(screen.getByRole('option', { name: 'All statuses' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'All categories' })).toBeInTheDocument()
  })

  it('reports a status change without disturbing the category', async () => {
    const onChange = vi.fn()
    render(<ExpenseFilters filters={ALL} onChange={onChange} />)

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'paid')

    expect(onChange).toHaveBeenCalledWith({ status: 'paid', category: 'all' })
  })

  it('reports a category change without disturbing the status', async () => {
    const onChange = vi.fn()
    render(<ExpenseFilters filters={{ status: 'paid', category: 'all' }} onChange={onChange} />)

    await userEvent.selectOptions(screen.getByLabelText('Category'), 'materials')

    expect(onChange).toHaveBeenCalledWith({ status: 'paid', category: 'materials' })
  })

  it('reflects the filters it is given', () => {
    render(
      <ExpenseFilters filters={{ status: 'planned', category: 'labour' }} onChange={vi.fn()} />,
    )

    expect(screen.getByLabelText('Status')).toHaveValue('planned')
    expect(screen.getByLabelText('Category')).toHaveValue('labour')
  })
})
