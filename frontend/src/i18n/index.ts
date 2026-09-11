export type { Locale } from './locale'
export { LOCALES, isLocale } from './locale'

export type { MessageKey } from './messages.en'
export { en } from './messages.en'
export { pt } from './messages.pt'

export type { TranslateParams } from './translate'
export { translate } from './translate'

export type { LocaleContextValue, TranslateFn } from './context'

export type { MessageDescriptor, MessageParamValue } from './descriptor'
export { describe, translateDescriptor } from './descriptor'

export { LocaleProvider } from './LocaleProvider'
export type { LocaleProviderProps } from './LocaleProvider'

export { useTranslation } from './useTranslation'

export { useFormat } from './useFormat'
export type { UseFormatResult } from './useFormat'

export { LanguageSwitcher } from './LanguageSwitcher'
