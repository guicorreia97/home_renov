import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Locale } from './locale'
import { LocaleProvider } from './LocaleProvider'
import { translate } from './translate'
import { useTranslation } from './useTranslation'

/** The label the Consumer renders, from the catalogue rather than retyped. */
const paidIn = (locale: Locale): string => translate(locale, 'expense.status.paid')

const STORAGE_KEY = 'home_renov.locale'

function Consumer() {
  const { locale, setLocale, t } = useTranslation()
  return (
    <div>
      <p>locale: {locale}</p>
      <p>{t('expense.status.paid')}</p>
      <button onClick={() => setLocale(locale === 'en' ? 'pt-PT' : 'en')}>toggle</button>
    </div>
  )
}

describe('LocaleProvider / useTranslation', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('throws outside a provider, rather than silently defaulting to English', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Consumer />)).toThrow('useTranslation must be used within a LocaleProvider')

    spy.mockRestore()
  })

  it('lets initialLocale bypass storage/browser detection entirely, for tests', () => {
    render(
      <LocaleProvider initialLocale="pt-PT">
        <Consumer />
      </LocaleProvider>,
    )

    expect(screen.getByText('locale: pt-PT')).toBeInTheDocument()
    expect(screen.getByText(paidIn('pt-PT'))).toBeInTheDocument()
  })

  it('resolves the initial locale from storage when no initialLocale is given', () => {
    window.localStorage.setItem(STORAGE_KEY, 'pt-PT')

    render(
      <LocaleProvider>
        <Consumer />
      </LocaleProvider>,
    )

    expect(screen.getByText('locale: pt-PT')).toBeInTheDocument()
  })

  it('re-renders every consumer and persists the choice when the user switches', async () => {
    render(
      <LocaleProvider initialLocale="en">
        <Consumer />
      </LocaleProvider>,
    )
    expect(screen.getByText(paidIn('en'))).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }))

    expect(screen.getByText(paidIn('pt-PT'))).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('pt-PT')
  })

  it('sets document.documentElement.lang to the active locale, and updates it on switch', async () => {
    render(
      <LocaleProvider initialLocale="en">
        <Consumer />
      </LocaleProvider>,
    )
    expect(document.documentElement.lang).toBe('en')

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }))

    expect(document.documentElement.lang).toBe('pt-PT')
  })

  it('still renders and still switches for the session when localStorage throws on every access', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('Site data is blocked for this origin.')
      },
    })

    try {
      render(
        <LocaleProvider>
          <Consumer />
        </LocaleProvider>,
      )
      // Which locale detection picked depends on the environment, so read it from
      // the Consumer's own output, then prove the label follows the switch.
      const initial = screen.getByText(/^locale: /).textContent?.replace('locale: ', '') as Locale
      const next: Locale = initial === 'en' ? 'pt-PT' : 'en'
      expect(screen.getByText(paidIn(initial))).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'toggle' }))

      expect(screen.getByText(`locale: ${next}`)).toBeInTheDocument()
      expect(screen.getByText(paidIn(next))).toBeInTheDocument()
    } finally {
      if (originalDescriptor) Object.defineProperty(window, 'localStorage', originalDescriptor)
    }
  })
})
