import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  defaultLanguage,
  isLanguage,
  languageStorageKey,
  translations,
} from './translations'
import type { Language } from './translations'
import { I18nContext } from './useI18n'

interface I18nProviderProps {
  children: ReactNode
}

function readStoredLanguage(): Language {
  try {
    const storedLanguage = localStorage.getItem(languageStorageKey)
    return isLanguage(storedLanguage) ? storedLanguage : defaultLanguage
  } catch {
    return defaultLanguage
  }
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguage] = useState<Language>(readStoredLanguage)

  useEffect(() => {
    document.documentElement.lang = language

    try {
      localStorage.setItem(languageStorageKey, language)
    } catch {
      // The selected language remains usable when storage is unavailable.
    }
  }, [language])

  const value = useMemo(
    () => ({ language, setLanguage, t: translations[language] }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
