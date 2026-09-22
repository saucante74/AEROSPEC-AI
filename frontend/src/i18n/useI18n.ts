import { createContext, useContext } from 'react'

import type { Language, Translations } from './translations'

interface I18nContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: Translations
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }

  return context
}
