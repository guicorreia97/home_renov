import { en } from './messages.en'
import { pt } from './messages.pt'

/**
 * The type system enforces this too (`pt: Record<MessageKey, string>`), but
 * only while someone keeps that annotation — `tsc` is not part of `npm test`,
 * so this is the runtime backstop. See design.md, decision 2.
 */
describe('catalogue parity', () => {
  it('has exactly the same keys in en and pt', () => {
    const enKeys = new Set(Object.keys(en))
    const ptKeys = new Set(Object.keys(pt))

    expect(ptKeys).toEqual(enKeys)
  })

  it('has a non-empty, non-blank value for every key in both catalogues', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim().length, `en["${key}"] is blank`).toBeGreaterThan(0)
    }
    for (const [key, value] of Object.entries(pt)) {
      expect(value.trim().length, `pt["${key}"] is blank`).toBeGreaterThan(0)
    }
  })
})
