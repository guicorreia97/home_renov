import { SelectField } from '../components/SelectField'
import type { SelectOption } from '../components/SelectField'
import { LOCALES, isLocale } from './locale'
import { useTranslation } from './useTranslation'

/**
 * The app shell's language control — the existing `SelectField`, two
 * options, no new token or component shape (design.md, decision 9). Options
 * are labelled with each language's own endonym (`app.language.<code>`),
 * which is deliberately identical in both catalogues — a language's own name
 * is never translated.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation()

  const options: SelectOption[] = LOCALES.map((code) => ({
    value: code,
    label: t(`app.language.${code}`),
  }))

  return (
    <SelectField
      label={t('app.language')}
      options={options}
      value={locale}
      onChange={(event) => {
        const next = event.target.value
        if (isLocale(next)) setLocale(next)
      }}
    />
  )
}
