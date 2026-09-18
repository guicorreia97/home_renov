import type { MessageKey } from '../../i18n'

/**
 * The three views the desk is divided into. Only `ledger` has content in this
 * change — it hosts the existing `ExpensesScreen` unmodified. `budget` and
 * `profit` are real, selectable tabs with no panel behind them yet: building
 * one against data the API cannot supply would be the mock data the design
 * explicitly rejects (design.md, Decision 4). They arrive in
 * `feat/flip-desk-panels`.
 */
export type ShellTabId = 'budget' | 'ledger' | 'profit'

export interface ShellTab {
  id: ShellTabId
  labelKey: MessageKey
}

export const SHELL_TABS: ShellTab[] = [
  { id: 'budget', labelKey: 'shell.tab.budget' },
  { id: 'ledger', labelKey: 'shell.tab.ledger' },
  { id: 'profit', labelKey: 'shell.tab.profit' },
]

/**
 * The tab shown on first render. It must be `ledger`: that is the tab
 * carrying the existing `ExpensesScreen`, whose own `<h1>` is what the
 * pre-shell connected-state tests (`App.test.tsx`) already look for right
 * after the health check resolves.
 */
export const DEFAULT_SHELL_TAB: ShellTabId = 'ledger'

/** IDs shared between `TabNav`'s `role="tab"` and `AppShell`'s `role="tabpanel"`. */
export function tabElementId(tab: ShellTabId): string {
  return `shell-tab-${tab}`
}
export function panelElementId(tab: ShellTabId): string {
  return `shell-panel-${tab}`
}
