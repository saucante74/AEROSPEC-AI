import { useEffect, useRef } from 'react'

import { content } from '../content'

interface LogoutDialogProps {
  onCancel: () => void
  onConfirm: () => void
}

export default function LogoutDialog({
  onCancel,
  onConfirm,
}: LogoutDialogProps) {
  const dialog = useRef<HTMLElement>(null)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const { logout } = content

  useEffect(() => {
    const previousFocus = document.activeElement
    cancelButton.current?.focus()

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel()
        return
      }

      if (event.key !== 'Tab' || !dialog.current) {
        return
      }

      const buttons = Array.from(
        dialog.current.querySelectorAll<HTMLButtonElement>('button'),
      )
      const firstButton = buttons[0]
      const lastButton = buttons.at(-1)

      if (event.shiftKey && document.activeElement === firstButton) {
        event.preventDefault()
        lastButton?.focus()
      } else if (!event.shiftKey && document.activeElement === lastButton) {
        event.preventDefault()
        firstButton?.focus()
      }
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus()
      }
    }
  }, [onCancel])

  return (
    <div className="login-modal-backdrop">
      <section
        ref={dialog}
        className="confirmation-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-description"
      >
        <h2 id="logout-title">{logout.title}</h2>
        <p id="logout-description">{logout.message}</p>
        <div className="login-actions">
          <button
            ref={cancelButton}
            className="login-cancel"
            type="button"
            onClick={onCancel}
          >
            {logout.cancel}
          </button>
          <button type="button" onClick={onConfirm}>
            {logout.confirm}
          </button>
        </div>
      </section>
    </div>
  )
}
