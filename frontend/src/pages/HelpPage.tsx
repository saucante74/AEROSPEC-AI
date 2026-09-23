import { useI18n } from '../i18n/useI18n'

export default function HelpPage() {
  const { t } = useI18n()

  return (
    <main className="help-page">
      <section className="help-hero content-width" aria-labelledby="help-title">
        <p className="eyebrow">{t.help.eyebrow}</p>
        <h1 id="help-title">{t.help.title}</h1>
        <p>{t.help.introduction}</p>
      </section>

      <div className="help-content content-width">
        <section className="help-section" aria-labelledby="workflow-title">
          <h2 id="workflow-title">{t.help.workflowTitle}</h2>
          <ol className="workflow-grid">
            {t.help.steps.map((step, index) => (
              <li className="workflow-card" key={step.title}>
                <span className="workflow-number" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <div className="help-topic-grid">
          <section className="help-section help-card" aria-labelledby="citations-help-title">
            <h2 id="citations-help-title">{t.help.citations.title}</h2>
            <p>{t.help.citations.description}</p>
            <p className="help-list-introduction">
              {t.help.citations.detailsIntroduction}
            </p>
            <ul className="help-list">
              {t.help.citations.fields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
            <p className="help-caveat">{t.help.citations.caveat}</p>
          </section>

          <section className="help-section help-card" aria-labelledby="cannot-answer-title">
            <h2 id="cannot-answer-title">{t.help.cannotAnswer.title}</h2>
            <p>{t.help.cannotAnswer.description}</p>
          </section>
        </div>

        <section className="help-section help-card" aria-labelledby="tips-title">
          <h2 id="tips-title">{t.help.tips.title}</h2>
          <ul className="tips-grid">
            {t.help.tips.items.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section className="help-section scope-section" aria-labelledby="scope-title">
          <div className="scope-heading">
            <h2 id="scope-title">{t.help.scope.title}</h2>
            <p>{t.help.scope.introduction}</p>
          </div>
          <div className="scope-grid">
            <div className="scope-card">
              <h3>{t.help.scope.capabilitiesTitle}</h3>
              <ul className="help-list">
                {t.help.scope.capabilities.map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            </div>
            <div className="scope-card scope-limitations">
              <h3>{t.help.scope.limitationsTitle}</h3>
              <ul className="help-list">
                {t.help.scope.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
