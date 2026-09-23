import { useI18n } from '../i18n/useI18n'

export default function Footer() {
  const { t } = useI18n()

  return (
    <footer className="site-footer" id="about">
      <div className="footer-content content-width">
        <div>
          <strong>{t.nav.brand}</strong>
          <p>{t.footer.subtitle}</p>
        </div>
        <p className="footer-capabilities">
          {t.footer.groundedAnswers} <span aria-hidden="true">·</span>{' '}
          {t.footer.validatedCitations} <span aria-hidden="true">·</span>{' '}
          {t.footer.deterministicTools}
        </p>
      </div>
    </footer>
  )
}
