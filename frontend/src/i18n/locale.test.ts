import { LOCALES, isLocale, readStoredLocale, resolveInitialLocale, writeStoredLocale } from './locale'

const STORAGE_KEY = 'home_renov.locale'

function setBrowserLanguages(languages: string[]): void {
  Object.defineProperty(window.navigator, 'languages', { value: languages, configurable: true })
  Object.defineProperty(window.navigator, 'language', { value: languages[0], configurable: true })
}

describe('locale', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('exposes exactly the two supported locales', () => {
    expect(LOCALES).toEqual(['en', 'pt-PT'])
  })

  it('recognises only the two supported locale strings', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('pt-PT')).toBe(true)
    expect(isLocale('pt-BR')).toBe(false)
    expect(isLocale('fr-FR')).toBe(false)
    expect(isLocale(null)).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })

  describe('resolveInitialLocale', () => {
    it('prefers a valid stored value over the browser language', () => {
      setBrowserLanguages(['fr-FR'])
      window.localStorage.setItem(STORAGE_KEY, 'pt-PT')

      expect(resolveInitialLocale()).toBe('pt-PT')
    })

    it('opens in pt-PT for a Portuguese browser when nothing is stored', () => {
      setBrowserLanguages(['pt-BR'])

      expect(resolveInitialLocale()).toBe('pt-PT')
    })

    it('falls back to English for an unsupported browser language', () => {
      setBrowserLanguages(['fr-FR'])

      expect(resolveInitialLocale()).toBe('en')
    })

    it('ignores an unrecognised stored value and falls back to browser detection', () => {
      setBrowserLanguages(['pt-PT'])
      window.localStorage.setItem(STORAGE_KEY, 'de-DE')

      expect(resolveInitialLocale()).toBe('pt-PT')
    })

    it('does not itself write to storage — only an explicit switch does', () => {
      setBrowserLanguages(['pt-PT'])

      resolveInitialLocale()

      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  describe('when localStorage throws', () => {
    it('readStoredLocale returns null when the accessor itself throws', () => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          throw new Error('Site data is blocked for this origin.')
        },
      })

      try {
        expect(() => readStoredLocale()).not.toThrow()
        expect(readStoredLocale()).toBeNull()
      } finally {
        if (originalDescriptor) Object.defineProperty(window, 'localStorage', originalDescriptor)
      }
    })

    it('readStoredLocale returns null when getItem throws', () => {
      const original = window.localStorage.getItem.bind(window.localStorage)
      window.localStorage.getItem = () => {
        throw new Error('blocked')
      }

      try {
        expect(readStoredLocale()).toBeNull()
      } finally {
        window.localStorage.getItem = original
      }
    })

    it('writeStoredLocale does not throw when setItem throws', () => {
      const original = window.localStorage.setItem.bind(window.localStorage)
      window.localStorage.setItem = () => {
        throw new Error('blocked')
      }

      try {
        expect(() => writeStoredLocale('pt-PT')).not.toThrow()
      } finally {
        window.localStorage.setItem = original
      }
    })
  })
})
