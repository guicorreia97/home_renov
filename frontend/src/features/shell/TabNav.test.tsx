import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLocale } from '../../test/renderWithLocale'
import { TabNav } from './TabNav'

describe('TabNav', () => {
  it('exposes exactly one tab as selected to assistive technology', () => {
    const { t } = renderWithLocale(<TabNav activeTab="ledger" onSelectTab={() => {}} />)

    expect(screen.getByRole('tab', { name: t('shell.tab.ledger') })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: t('shell.tab.budget') })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    expect(screen.getByRole('tab', { name: t('shell.tab.profit') })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('calls back with the tab that was activated', async () => {
    const user = userEvent.setup()
    const onSelectTab = vi.fn()
    const { t } = renderWithLocale(<TabNav activeTab="ledger" onSelectTab={onSelectTab} />)

    await user.click(screen.getByRole('tab', { name: t('shell.tab.profit') }))
    expect(onSelectTab).toHaveBeenCalledWith('profit')
  })
})
