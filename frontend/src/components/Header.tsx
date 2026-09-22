import { supportedLanguages } from '../i18n/translations'
import { useI18n } from '../i18n/useI18n'

interface HeaderProps {
  activePage: 'assistant' | 'evaluation' | 'help'
  onAssistantSelect: () => void
  onEvaluationSelect: () => void
  onHelpSelect: () => void
}

export default function Header({
  activePage,
  onAssistantSelect,
  onEvaluationSelect,
  onHelpSelect,
}: HeaderProps) {
  const { language, setLanguage, t } = useI18n()

  return (
    <header className="site-header">
      <nav className="navigation content-width" aria-label={t.nav.primaryLabel}>
        <div className="navigation-primary">
          <a className="brand" href="#top" aria-label={t.nav.homeLabel}>
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-copy">
              <strong>{t.nav.brand}</strong>
              <span>{t.nav.subtitle}</span>
            </span>
          </a>
          <div className="navigation-links">
            <button
              type="button"
              aria-pressed={activePage === 'assistant'}
              onClick={onAssistantSelect}
            >
              {t.nav.assistant}
            </button>
            <button
              type="button"
              aria-pressed={activePage === 'evaluation'}
              onClick={onEvaluationSelect}
            >
              {t.nav.evaluation}
            </button>
            <button
              type="button"
              aria-pressed={activePage === 'help'}
              onClick={onHelpSelect}
            >
              {t.nav.help}
            </button>
          </div>
        </div>
        <div
          className="language-selector"
          role="group"
          aria-label={t.nav.languageSelector}
        >
          {supportedLanguages.map((languageCode, index) => (
            <span className="language-option" key={languageCode}>
              {index > 0 && <span aria-hidden="true">|</span>}
              <button
                type="button"
                aria-label={t.nav.selectLanguage[languageCode]}
                aria-pressed={language === languageCode}
                onClick={() => setLanguage(languageCode)}
              >
                {languageCode.toUpperCase()}
              </button>
            </span>
          ))}
        </div>
      </nav>
    </header>
  )
}
