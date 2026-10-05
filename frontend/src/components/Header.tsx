import { useEffect, useState } from 'react'

import type { UsageStatus } from '../api/client'
import { content } from '../content'

interface HeaderProps {
  activePage: 'assistant' | 'documents' | 'evaluation' | 'help'
  onAssistantSelect: () => void
  onDocumentsSelect: () => void
  onEvaluationSelect: () => void
  onHelpSelect: () => void
  isAuthenticated: boolean
  usageStatus: UsageStatus | null
  onLoginSelect: () => void
  onLogoutSelect: () => void
}

function formatCountdown(remainingSeconds: number) {
  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, '0'))
    .join(':')
}

export default function Header({
  activePage,
  onAssistantSelect,
  onDocumentsSelect,
  onEvaluationSelect,
  onHelpSelect,
  isAuthenticated,
  usageStatus,
  onLoginSelect,
  onLogoutSelect,
}: HeaderProps) {
  const { nav, usage } = content
  const [countdown, setCountdown] = useState<{
    resetAt: string
    remainingSeconds: number
  } | null>(null)

  useEffect(() => {
    if (!usageStatus) {
      return
    }

    const resetAt = usageStatus.reset_at

    function updateCountdown() {
      const resetTime = Date.parse(resetAt)
      setCountdown({
        resetAt,
        remainingSeconds: Number.isNaN(resetTime)
          ? 0
          : Math.max(0, Math.ceil((resetTime - Date.now()) / 1000)),
      })
    }

    const initialUpdate = window.setTimeout(updateCountdown, 0)
    const timer = window.setInterval(updateCountdown, 1000)
    return () => {
      window.clearTimeout(initialUpdate)
      window.clearInterval(timer)
    }
  }, [usageStatus])

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
        <div className="navigation-account">
          {usageStatus && (
            <div className="usage-status" aria-label="Demo usage status">
              <div className="usage-quota">
                <span
                  className="usage-count"
                  aria-label={`${usageStatus.requests_remaining} of ${usageStatus.quota_limit} ${usage.requestsRemaining}`}
                >
                  {usageStatus.requests_remaining} / {usageStatus.quota_limit}
                </span>
                <progress
                  aria-label={usage.requestsRemaining}
                  max={usageStatus.quota_limit}
                  value={usageStatus.requests_remaining}
                />
              </div>
              <span className="usage-countdown">
                {usage.reset}{' '}
                {countdown?.resetAt === usageStatus.reset_at
                  ? formatCountdown(countdown.remainingSeconds)
                  : '--:--:--'}
              </span>
            </div>
          )}
          <button
            className="auth-control"
            type="button"
            aria-label={isAuthenticated ? usage.logOut : usage.signIn}
            title={isAuthenticated ? usage.logOut : usage.signIn}
            onClick={isAuthenticated ? onLogoutSelect : onLoginSelect}
          >
            <span aria-hidden="true">{isAuthenticated ? '↩' : '↪'}</span>
            <span className="auth-control-label">
              {isAuthenticated ? usage.logOut : usage.signIn}
            </span>
          </button>
        </div>
      </nav>
    </header>
  )
}
