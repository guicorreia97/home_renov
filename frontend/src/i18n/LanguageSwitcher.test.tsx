import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithLocale } from '../test/renderWithLocale'
import { translate } from './translate'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useTranslation } from './useTranslation'

const STORAGE_KEY = 'home_renov.locale'

function Probe() {
  const { locale } = useTranslation()
  return <p>active: {locale}</p>
}

describe('LanguageSwitcher', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('renders exactly the two supported languages, labelled with their own endonym', () => {
    renderWithLocale(<LanguageSwitcher />)

    expect(
      screen.getByRole('option', { name: translate('en', 'app.language.en') }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('option', { name: translate('en', 'app.language.pt-PT') }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('has a visible, localised label', () => {
    renderWithLocale(<LanguageSwitcher />, 'pt-PT')

    expect(screen.getByLabelText(translate('pt-PT', 'app.language'))).toBeInTheDocument()
  })

  it('switches the active language and persists the choice', async () => {
    renderWithLocale(
      <>
        <LanguageSwitcher />
        <Probe />
      </>,
      'en',
    )
    expect(screen.getByText('active: en')).toBeInTheDocument()

    await userEvent.selectOptions(
      screen.getByLabelText(translate('en', 'app.language')),
      translate('en', 'app.language.pt-PT'),
    )

    expect(screen.getByText('active: pt-PT')).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('pt-PT')
  })
})
