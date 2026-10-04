import hashlib
import hmac
import secrets
from collections.abc import Callable
from dataclasses import dataclass
from threading import Lock
from time import time

import bcrypt


@dataclass(frozen=True)
class AuthSession:
    access_token: str
    expires_in: int


class DemoAuthenticator:
    def __init__(
        self,
        username: str,
        password_hash: str,
        session_ttl_seconds: int = 14_400,
        clock: Callable[[], float] = time,
    ) -> None:
        if not username or not password_hash:
            raise ValueError("Demo credentials must be configured.")
        if session_ttl_seconds <= 0:
            raise ValueError("Session lifetime must be positive.")

        self._username = username
        self._password_hash = password_hash.encode()
        self._session_ttl_seconds = session_ttl_seconds
        self._clock = clock
        self._lock = Lock()
        self._sessions: dict[str, float] = {}

    def login(self, username: str, password: str) -> AuthSession | None:
        username_matches = hmac.compare_digest(
            username.encode(),
            self._username.encode(),
        )
        try:
            password_matches = bcrypt.checkpw(
                password.encode(),
                self._password_hash,
            )
        except (ValueError, UnicodeEncodeError):
            password_matches = False

        if not username_matches or not password_matches:
            return None

        token = secrets.token_urlsafe(32)
        expires_at = self._clock() + self._session_ttl_seconds
        token_digest = self._token_digest(token)

        with self._lock:
            self._remove_expired_sessions()
            self._sessions[token_digest] = expires_at

        return AuthSession(
            access_token=token,
            expires_in=self._session_ttl_seconds,
        )

    def authenticate(self, token: str) -> str | None:
        token_digest = self._token_digest(token)
        now = self._clock()

        with self._lock:
            expires_at = self._sessions.get(token_digest)
            if expires_at is None:
                return None
            if expires_at <= now:
                del self._sessions[token_digest]
                return None

        return self._username

    def _remove_expired_sessions(self) -> None:
        now = self._clock()
        expired_tokens = [
            token_digest
            for token_digest, expires_at in self._sessions.items()
            if expires_at <= now
        ]
        for token_digest in expired_tokens:
            del self._sessions[token_digest]

    @staticmethod
    def _token_digest(token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()
