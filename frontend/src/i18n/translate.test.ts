import { en } from './messages.en'
import type { MessageKey } from './messages.en'
import { pt } from './messages.pt'
import { translate } from './translate'

describe('translate', () => {
  // Expectations come from the catalogues, never retyped copy, so rewording a
  // message (task 6.2's native review, say) cannot break these tests.
  it('looks up the message for the given locale', () => {
    const key: MessageKey = 'expense.status.paid'
    // Otherwise the two lookups below could not tell the locales apart.
    expect(pt[key]).not.toBe(en[key])

    expect(translate('en', key)).toBe(en[key])
    expect(translate('pt-PT', key)).toBe(pt[key])
  })

  it('interpolates a named placeholder', () => {
    const key: MessageKey = 'budget.remaining.percentUsed'
    expect(en[key]).toContain('{percent}')
    expect(pt[key]).toContain('{percent}')

    expect(translate('en', key, { percent: 'PCT' })).toBe(en[key].replace('{percent}', 'PCT'))
    expect(translate('pt-PT', key, { percent: 'PCT' })).toBe(pt[key].replace('{percent}', 'PCT'))
  })

  it('leaves a placeholder untouched when no matching param is given', () => {
    const key: MessageKey = 'budget.remaining.percentUsed'
    expect(en[key]).toContain('{percent}')

    expect(translate('en', key)).toBe(en[key])
    expect(translate('en', key, { other: 'x' })).toBe(en[key])
  })

  it('reports a runtime catalogue miss and falls back to the English message', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const key: MessageKey = 'expense.status.paid'
    // `pt` is typed `Record<MessageKey, string>`, so this drift is normally
    // impossible — simulated here to prove the runtime guard the type alone
    // cannot: see design.md, Risks — "the English fallback masks a missing
    // key at runtime if the type annotation is ever weakened".
    const mutablePt = pt as Record<string, string | undefined>
    const original = mutablePt[key]
    delete mutablePt[key]

    const result = translate('pt-PT', key)

    expect(result).toBe(en[key])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]?.[0]).toContain(key)
    expect(spy.mock.calls[0]?.[0]).toContain('pt-PT')

    mutablePt[key] = original
    spy.mockRestore()
  })
})
