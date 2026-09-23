import { useI18n } from '../i18n/useI18n'

const documentFiles = [
  'AMPHENOL_connector_datasheet.pdf',
  'HARWIN_connector_datasheet.pdf',
  'MIL_connector_datasheet.pdf',
  'MOLEX_connector_datasheet.pdf',
  'SAMTEC_connector_datasheet.pdf',
] as const

export default function DocumentsPage() {
  const { t } = useI18n()

  return (
    <main className="documents-page">
      <section
        className="documents-hero content-width"
        aria-labelledby="documents-title"
      >
        <p className="eyebrow">{t.documents.eyebrow}</p>
        <h1 id="documents-title">{t.documents.title}</h1>
        <p>{t.documents.introduction}</p>
      </section>

      <section
        className="documents-content content-width"
        aria-label={t.documents.listLabel}
      >
        <ul className="document-grid">
          {documentFiles.map((fileName, index) => {
            const label = t.documents.items[index]

            return (
              <li className="document-card" key={fileName}>
                <div>
                  <span className="document-type">PDF</span>
                  <h2>{label}</h2>
                  <p>{fileName}</p>
                </div>
                <a
                  href={`/${fileName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t.documents.openDocument}: ${label}`}
                >
                  {t.documents.open}
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
