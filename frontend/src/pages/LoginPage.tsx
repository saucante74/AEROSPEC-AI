import { useState } from 'react'
import type { SubmitEvent } from 'react'

import { ApiError } from '../api/client'
import { content } from '../content'

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { auth, nav } = content

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await onLogin(username, password)
    } catch (caughtError) {
      if (caughtError instanceof ApiError && caughtError.status === 429) {
        setError(auth.tooManyAttempts)
      } else if (caughtError instanceof ApiError && caughtError.status === 401) {
        setError(auth.invalidCredentials)
      } else {
        setError(auth.unavailable)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-shell">
      <main className="login-card" aria-labelledby="login-title">
        <div className="login-brand" aria-label={nav.homeLabel}>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-copy">
            <strong>{nav.brand}</strong>
            <span>{nav.subtitle}</span>
          </span>
        </div>
        <p className="eyebrow">{auth.eyebrow}</p>
        <h1 id="login-title">{auth.title}</h1>
        <p className="login-introduction">{auth.description}</p>

        <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <label htmlFor="username">{auth.username}</label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            maxLength={100}
            disabled={isSubmitting}
            required
          />

          <label htmlFor="password">{auth.password}</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            maxLength={200}
            disabled={isSubmitting}
            required
          />

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={isSubmitting || !username || !password}>
            {isSubmitting ? auth.signingIn : auth.signIn}
          </button>
        </form>
      </main>
    </div>
  )
}
