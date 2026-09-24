import { content } from '../content'

export default function Footer() {
  const { footer, nav } = content

  return (
    <footer className="site-footer" id="about">
      <div className="footer-content content-width">
        <div>
          <strong>{nav.brand}</strong>
          <p>{footer.subtitle}</p>
        </div>
        <p className="footer-capabilities">
          {footer.groundedAnswers} <span aria-hidden="true">·</span>{' '}
          {footer.validatedCitations} <span aria-hidden="true">·</span>{' '}
          {footer.deterministicTools}
        </p>
      </div>
    </footer>
  )
}
