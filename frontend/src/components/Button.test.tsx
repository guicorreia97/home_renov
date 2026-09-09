import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('renders a real <button>, not a clickable div', () => {
    render(<Button>Add expense</Button>)

    expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument()
  })

  it('defaults to type="button" so it cannot submit a form by accident', () => {
    render(<Button>Cancel</Button>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('accepts an explicit submit type', () => {
    render(<Button type="submit">Save</Button>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)

    await userEvent.click(screen.getByRole('button'))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire onClick while disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Saving…
      </Button>,
    )

    await userEvent.click(screen.getByRole('button'))

    expect(onClick).not.toHaveBeenCalled()
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('gives only the primary variant the accent fill', () => {
    const { rerender } = render(<Button variant="primary">One</Button>)
    expect(screen.getByRole('button').className).toContain('bg-accent')

    for (const variant of ['secondary', 'ghost'] as const) {
      rerender(<Button variant={variant}>One</Button>)
      expect(screen.getByRole('button').className).not.toContain('bg-accent')
    }
  })

  it('uses the danger token for destructive actions', () => {
    render(<Button variant="destructive">Delete</Button>)

    expect(screen.getByRole('button').className).toContain('bg-danger')
  })
})
