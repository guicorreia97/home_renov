import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { aBudget } from '../../test/fixtures'
import { BudgetSettingsModal } from './BudgetSettingsModal'

function renderModal(props: Partial<Parameters<typeof BudgetSettingsModal>[0]> = {}) {
  const onSave = vi.fn().mockResolvedValue(true)
  const onClose = vi.fn()
  render(
    <BudgetSettingsModal
      budget={aBudget()}
      saving={false}
      saveError={null}
      onSave={onSave}
      onClose={onClose}
      {...props}
    />,
  )
  return { onSave, onClose }
}

describe('BudgetSettingsModal', () => {
  it('is a dialog with an accessible name and the three targets', () => {
    renderModal()

    expect(screen.getByRole('dialog')).toHaveAccessibleName('Budget settings')
    expect(screen.getByLabelText('Planned budget')).toHaveValue('50000.00')
    expect(screen.getByLabelText('Purchase price')).toHaveValue('180000.00')
    expect(screen.getByLabelText('Target sale price')).toHaveValue('260000.00')
  })

  it('starts empty when no budget has been set', () => {
    renderModal({ budget: null })

    expect(screen.getByLabelText('Planned budget')).toHaveValue('')
  })

  it('saves the typed targets as strings and closes on success', async () => {
    const { onSave, onClose } = renderModal({ budget: null })

    await userEvent.type(screen.getByLabelText('Planned budget'), '1234.50')
    await userEvent.click(screen.getByRole('button', { name: 'Save budget' }))

    expect(onSave).toHaveBeenCalledWith({
      planned_budget: '1234.50',
      purchase_price: null,
      target_sale_price: null,
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('sends a cleared field as null, never as zero', async () => {
    const { onSave } = renderModal({ budget: aBudget({ planned_budget: '50000.00' }) })

    await userEvent.clear(screen.getByLabelText('Planned budget'))
    await userEvent.click(screen.getByRole('button', { name: 'Save budget' }))

    const payload = onSave.mock.calls[0][0] as Record<string, unknown>
    expect(payload.planned_budget).toBeNull()
    expect(payload.planned_budget).not.toBe('0')
  })

  it('accepts zero as a deliberate target, unlike an expense amount', async () => {
    const { onSave } = renderModal({ budget: null })

    await userEvent.type(screen.getByLabelText('Planned budget'), '0')
    await userEvent.click(screen.getByRole('button', { name: 'Save budget' }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ planned_budget: '0' }))
  })

  it('blocks an invalid amount before it reaches the API', async () => {
    const { onSave } = renderModal({ budget: null })

    await userEvent.type(screen.getByLabelText('Planned budget'), '-5')
    await userEvent.click(screen.getByRole('button', { name: 'Save budget' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Planned budget')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows no validation errors before the first submit', () => {
    renderModal({ budget: aBudget({ planned_budget: 'nonsense' }) })

    expect(screen.queryByText(/must be a non-negative number/i)).not.toBeInTheDocument()
  })

  it('stays open and shows the API error when the save is rejected', async () => {
    const onSave = vi.fn().mockResolvedValue(false)
    const onClose = vi.fn()
    render(
      <BudgetSettingsModal
        budget={null}
        saving={false}
        saveError="planned_budget: must be non-negative"
        onSave={onSave}
        onClose={onClose}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save budget' }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText('planned_budget: must be non-negative')).toBeInTheDocument()
  })

  it('disables both actions and says so while saving', () => {
    renderModal({ saving: true })

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('closes without saving when cancelled', async () => {
    const { onSave, onClose } = renderModal()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })
})
