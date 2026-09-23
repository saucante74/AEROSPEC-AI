import { content } from '../content'

interface HeaderProps {
  activePage: 'assistant' | 'documents' | 'evaluation' | 'help'
  onAssistantSelect: () => void
  onDocumentsSelect: () => void
  onEvaluationSelect: () => void
  onHelpSelect: () => void
}

export default function Header({
  activePage,
  onAssistantSelect,
  onDocumentsSelect,
  onEvaluationSelect,
  onHelpSelect,
}: HeaderProps) {
  const { nav } = content

  return (
    <header className="site-header">
      <nav className="navigation content-width" aria-label={nav.primaryLabel}>
        <div className="navigation-primary">
          <a className="brand" href="#top" aria-label={nav.homeLabel}>
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-copy">
              <strong>{nav.brand}</strong>
              <span>{nav.subtitle}</span>
            </span>
          </a>
          <div className="navigation-links">
            <button
              type="button"
              aria-pressed={activePage === 'assistant'}
              onClick={onAssistantSelect}
            >
              {nav.assistant}
            </button>
            <button
              type="button"
              aria-pressed={activePage === 'documents'}
              onClick={onDocumentsSelect}
            >
              {nav.documents}
            </button>
            <button
              type="button"
              aria-pressed={activePage === 'evaluation'}
              onClick={onEvaluationSelect}
            >
              {nav.evaluation}
            </button>
            <button
              type="button"
              aria-pressed={activePage === 'help'}
              onClick={onHelpSelect}
            >
              {nav.help}
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
