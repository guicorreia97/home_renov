import { LanguageSwitcher, useTranslation } from './i18n'

/**
 * The app shell's header: the product name plus the language control,
 * rendered above the content in every connection state — checking, failed
 * and connected — so the switcher is always reachable. The product name is
 * plain text, not a heading; each connection state still owns its own `h1`.
 */
export function AppHeader() {
  const { t } = useTranslation()

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-content items-end justify-between px-6 py-4">
        <p className="text-body text-text">{t('app.name')}</p>
        <LanguageSwitcher />
      </div>
    </header>
  )
}
