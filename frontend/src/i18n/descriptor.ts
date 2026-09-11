import type { TranslateFn } from './context'
import type { MessageKey } from './messages.en'
import type { TranslateParams } from './translate'

/**
 * A param value that is either literal (user content, e.g. an expense
 * description — never translated) or another message key to resolve first
 * (e.g. a field name, which must come from the catalogue too).
 */
export type MessageParamValue = string | number | { key: MessageKey }

/**
 * A translatable message that has not been translated yet — the "message
 * descriptor" from the rule "never store a translated string in state".
 * Validation and API-failure state hold one of these (or a bare failure
 * kind), never a rendered string, so a mid-edit language switch re-renders
 * the same descriptor in the new language instead of leaving stale text on
 * screen.
 */
export interface MessageDescriptor {
  key: MessageKey
  params?: Record<string, MessageParamValue>
}

export function describe(key: MessageKey, params?: Record<string, MessageParamValue>): MessageDescriptor {
  return params ? { key, params } : { key }
}

/**
 * Resolves a descriptor to display text in `t`'s active locale, translating
 * any nested `{ key }` param first — e.g. `budget.error.notANumber`'s
 * `{field}` is itself `budget.field.plannedBudget`, not literal text.
 */
export function translateDescriptor(t: TranslateFn, descriptor: MessageDescriptor): string {
  if (!descriptor.params) return t(descriptor.key)

  const resolved: TranslateParams = {}
  for (const [name, value] of Object.entries(descriptor.params)) {
    resolved[name] = typeof value === 'object' ? t(value.key) : value
  }
  return t(descriptor.key, resolved)
}
