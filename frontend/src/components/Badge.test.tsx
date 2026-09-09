import { render, screen } from '@testing-library/react'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders its label', () => {
    render(<Badge tone="success">Paid</Badge>)

    expect(screen.getByText('Paid')).toBeInTheDocument()
  })

  it('pairs each tone with its soft fill and full-strength text token', () => {
    const pairs = [
      ['success', 'bg-success-soft', 'text-success'],
      ['warning', 'bg-warning-soft', 'text-warning'],
      ['danger', 'bg-danger-soft', 'text-danger'],
    ] as const

    for (const [tone, fill, text] of pairs) {
      const { unmount } = render(<Badge tone={tone}>{tone}</Badge>)
      const className = screen.getByText(tone).className

      expect(className).toContain(fill)
      expect(className).toContain(text)
      unmount()
    }
  })

  it('keeps the neutral tone off the status palette', () => {
    render(<Badge tone="neutral">Draft</Badge>)
    const className = screen.getByText('Draft').className

    expect(className).toContain('bg-surface-raised')
    expect(className).not.toMatch(/success|warning|danger/)
  })

  it('is a pill', () => {
    render(<Badge tone="success">Paid</Badge>)

    expect(screen.getByText('Paid').className).toContain('rounded-pill')
  })
})
