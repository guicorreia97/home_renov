import { useTranslation } from '../../i18n'
import { panelElementId, SHELL_TABS, tabElementId, type ShellTabId } from './tabs'

export interface TabNavProps {
  activeTab: ShellTabId
  onSelectTab: (tab: ShellTabId) => void
}

/**
 * The three-way switch between the works budget, the ledger and the profit
 * view. A native `role="tablist"`/`role="tab"` pair, so the active tab is
 * `aria-selected` for assistive technology without any extra wiring.
 */
export function TabNav({ activeTab, onSelectTab }: TabNavProps) {
  const { t } = useTranslation()

  return (
    <div
      role="tablist"
      aria-label={t('shell.tabs.label')}
      className="flex shrink-0 gap-1 border-b border-border bg-surface px-6"
    >
      {SHELL_TABS.map((tab) => {
        const selected = tab.id === activeTab
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={tabElementId(tab.id)}
            aria-selected={selected}
            aria-controls={panelElementId(tab.id)}
            onClick={() => onSelectTab(tab.id)}
            className={`min-h-control border-b-2 px-3 py-3 text-body font-medium transition-colors duration-150 ease-out ${
              selected
                ? 'border-accent text-text'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        )
      })}
    </div>
  )
}
