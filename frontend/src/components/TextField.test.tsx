import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TextField } from './TextField'

describe('TextField', () => {
  it('associates the label with the input, so getByLabelText finds it', () => {
    render(<TextField label="Planned budget" />)

    expect(screen.getByLabelText('Planned budget')).toBeInTheDocument()
  })

  it('lets the caller override the generated id', () => {
    render(<TextField label="Amount" id="custom-id" />)

    expect(screen.getByLabelText('Amount')).toHaveAttribute('id', 'custom-id')
  })

  it('reports typed text to the caller', async () => {
    const onChange = vi.fn()
    render(<TextField label="Payee" value="" onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Payee'), 'Stone')

    expect(onChange).toHaveBeenCalled()
  })

  it('marks the input invalid and links the message when there is an error', () => {
    render(<TextField label="Amount" error="Amount must be a positive number." />)
    const input = screen.getByLabelText('Amount')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Amount must be a positive number.')
  })

  it('is not marked invalid when there is no error', () => {
    render(<TextField label="Amount" />)

    expect(screen.getByLabelText('Amount')).not.toHaveAttribute('aria-invalid')
  })

  it('shows a hint, and hides it once an error takes its place', () => {
    const { rerender } = render(<TextField label="Amount" hint="Leave empty for not set" />)
    expect(screen.getByText('Leave empty for not set')).toBeInTheDocument()

    rerender(<TextField label="Amount" hint="Leave empty for not set" error="Too many decimals" />)

    expect(screen.queryByText('Leave empty for not set')).not.toBeInTheDocument()
    expect(screen.getByText('Too many decimals')).toBeInTheDocument()
  })

  it('uses the danger border token only when in error', () => {
    const { rerender } = render(<TextField label="Amount" />)
    expect(screen.getByLabelText('Amount').className).toContain('border-border')

    rerender(<TextField label="Amount" error="Nope" />)

    expect(screen.getByLabelText('Amount').className).toContain('border-danger')
  })
})
