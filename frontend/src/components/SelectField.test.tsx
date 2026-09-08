import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SelectField } from './SelectField'

const options = [
  { value: 'all', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'planned', label: 'Planned' },
]

describe('SelectField', () => {
  it('associates the label with the select', () => {
    render(<SelectField label="Status" options={options} />)

    expect(screen.getByLabelText('Status')).toBeInTheDocument()
  })

  it('renders every option with its label', () => {
    render(<SelectField label="Status" options={options} />)

    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('option', { name: 'All statuses' })).toHaveValue('all')
  })

  it('reports the chosen value to the caller', async () => {
    const onChange = vi.fn()
    render(<SelectField label="Status" options={options} value="all" onChange={onChange} />)

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'paid')

    expect(onChange).toHaveBeenCalled()
  })

  it('marks the select invalid and links the message when there is an error', () => {
    render(<SelectField label="Status" options={options} error="Pick one" />)
    const select = screen.getByLabelText('Status')

    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select).toHaveAccessibleDescription('Pick one')
  })

  it('renders no error text when there is no error', () => {
    render(<SelectField label="Status" options={options} />)

    expect(screen.getByLabelText('Status')).not.toHaveAttribute('aria-invalid')
  })
})
