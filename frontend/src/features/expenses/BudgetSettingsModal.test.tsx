import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Locale } from '../../i18n'
import { aBudget } from '../../test/fixtures'
import { renderWithLocale } from '../../test/renderWithLocale'
import { BudgetSettingsModal } from './BudgetSettingsModal'

function renderModal(
  props: Partial<Parameters<typeof BudgetSettingsModal>[0]> = {},
  locale: Locale = 'en',
) {
  const onSave = vi.fn().mockResolvedValue(true)
  const onClose = vi.fn()
  const { t } = renderWithLocale(
    <BudgetSettingsModal
      budget={aBudget()}
      saving={false}
      saveError={null}
      onSave={onSave}
      onClose={onClose}
      {...props}
    />,
    locale,
  )
  return { onSave, onClose, t }
}

describe.each(['en', 'pt-PT'] as const)('BudgetSettingsModal (%s)', (locale) => {
  it('is a dialog with an accessible name and the three targets', () => {
    const { t } = renderModal({}, locale)

    expect(screen.getByRole('dialog')).toHaveAccessibleName(t('budget.settings.title'))
    expect(screen.getByLabelText(t('budget.field.plannedBudget'))).toHaveValue('50000.00')
    expect(screen.getByLabelText(t('budget.field.purchasePrice'))).toHaveValue('180000.00')
    expect(screen.getByLabelText(t('budget.field.targetSalePrice'))).toHaveValue('260000.00')
  })

  it('starts empty when no budget has been set', () => {
    const { t } = renderModal({ budget: null }, locale)

    expect(screen.getByLabelText(t('budget.field.plannedBudget'))).toHaveValue('')
  })

  it('saves the typed targets as strings and closes on success', async () => {
    const { onSave, onClose, t } = renderModal({ budget: null }, locale)

    await userEvent.type(screen.getByLabelText(t('budget.field.plannedBudget')), '1234.50')
    await userEvent.click(screen.getByRole('button', { name: t('budget.action.save') }))

    expect(onSave).toHaveBeenCalledWith({
      planned_budget: '1234.50',
      purchase_price: null,
      target_sale_price: null,
    })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('sends a cleared field as null, never as zero', async () => {
    const { onSave, t } = renderModal({ budget: aBudget({ planned_budget: '50000.00' }) }, locale)

    await userEvent.clear(screen.getByLabelText(t('budget.field.plannedBudget')))
    await userEvent.click(screen.getByRole('button', { name: t('budget.action.save') }))

    const payload = onSave.mock.calls[0][0] as Record<string, unknown>
    expect(payload.planned_budget).toBeNull()
    expect(payload.planned_budget).not.toBe('0')
  })

  it('accepts zero as a deliberate target, unlike an expense amount', async () => {
    const { onSave, t } = renderModal({ budget: null }, locale)

    await userEvent.type(screen.getByLabelText(t('budget.field.plannedBudget')), '0')
    await userEvent.click(screen.getByRole('button', { name: t('budget.action.save') }))

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ planned_budget: '0' }))
  })

  it('blocks an invalid amount before it reaches the API, with the field named in the message', async () => {
    const { onSave, t } = renderModal({ budget: null }, locale)

    await userEvent.type(screen.getByLabelText(t('budget.field.plannedBudget')), '-5')
    await userEvent.click(screen.getByRole('button', { name: t('budget.action.save') }))

    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByLabelText(t('budget.field.plannedBudget'))).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.getByText(t('budget.error.notANumber', { field: t('budget.field.plannedBudget') })),
    ).toBeInTheDocument()
  })

  it('shows no validation errors before the first submit', () => {
    const { t } = renderModal({ budget: aBudget({ planned_budget: 'nonsense' }) }, locale)

    expect(
      screen.queryByText(t('budget.error.notANumber', { field: t('budget.field.plannedBudget') })),
    ).not.toBeInTheDocument()
  })

  it('stays open and shows a network failure when the save is rejected', async () => {
    const onSave = vi.fn().mockResolvedValue(false)
    const onClose = vi.fn()
    const { t } = renderWithLocale(
      <BudgetSettingsModal
        budget={null}
        saving={false}
        saveError="network"
        onSave={onSave}
        onClose={onClose}
      />,
      locale,
    )

    await userEvent.click(screen.getByRole('button', { name: t('budget.action.save') }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByText(t('budget.error.network'))).toBeInTheDocument()
  })

  it('shows a server failure with different copy from a network failure', () => {
    const { t } = renderModal({ saveError: 'server' }, locale)

    expect(screen.getByText(t('budget.error.server'))).toBeInTheDocument()
    expect(screen.queryByText(t('budget.error.network'))).not.toBeInTheDocument()
  })

  it('disables both actions and says so while saving', () => {
    const { t } = renderModal({ saving: true }, locale)

    expect(screen.getByRole('button', { name: t('budget.action.saving') })).toBeDisabled()
    expect(screen.getByRole('button', { name: t('budget.action.cancel') })).toBeDisabled()
  })

  it('closes without saving when cancelled', async () => {
    const { onSave, onClose, t } = renderModal({}, locale)

    await userEvent.click(screen.getByRole('button', { name: t('budget.action.cancel') }))

    expect(onClose).toHaveBeenCalledOnce()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows the same "leave blank" hint on all three targets', () => {
    const { t } = renderModal({}, locale)

    expect(screen.getAllByText(t('budget.settings.clearHint'))).toHaveLength(3)
  })
})
