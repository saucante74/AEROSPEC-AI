import { content } from '../content'

const documentFiles = [
  'AMPHENOL_connector_datasheet.pdf',
  'HARWIN_connector_datasheet.pdf',
  'MIL_connector_datasheet.pdf',
  'MOLEX_connector_datasheet.pdf',
  'SAMTEC_connector_datasheet.pdf',
] as const

export default function DocumentsPage() {
  const { documents } = content

  return (
    <main className="documents-page">
      <section
        className="documents-hero content-width"
        aria-labelledby="documents-title"
      >
        <p className="eyebrow">{documents.eyebrow}</p>
        <h1 id="documents-title">{documents.title}</h1>
        <p>{documents.introduction}</p>
      </section>

      <section
        className="documents-content content-width"
        aria-label={documents.listLabel}
      >
        <ul className="document-grid">
          {documentFiles.map((fileName, index) => {
            const label = documents.items[index]

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
                  aria-label={`${documents.openDocument}: ${label}`}
                >
                  {documents.open}
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
