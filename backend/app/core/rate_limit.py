"""Rate limiting en memoria para el login (por IP).

Para instancias con múltiples procesos/replicas se debe migrar a Redis
(nota en docs/DEPLOY.md). Es un límite por fallos: solo se cuentan
intentos fallidos, y un login correcto reinicia el contador.
"""

import time
from collections import defaultdict, deque

from fastapi import HTTPException, status


class LoginRateLimiter:
    def __init__(self, max_failures: int = 3, window_seconds: int = 300):
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._failures: dict[str, deque] = defaultdict(deque)

    def _prune(self, ip: str, now: float) -> None:
        dq = self._failures[ip]
        while dq and now - dq[0] > self.window_seconds:
            dq.popleft()

    def check(self, ip: str) -> None:
        """Bloquea (429) si la IP acumula demasiados fallos recientes."""
        now = time.monotonic()
        self._prune(ip, now)
        if len(self._failures[ip]) >= self.max_failures:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo.",
            )

    def record_failure(self, ip: str) -> None:
        now = time.monotonic()
        self._prune(ip, now)
        self._failures[ip].append(now)

    def record_success(self, ip: str) -> None:
        self._failures.pop(ip, None)

    def reset(self, ip: str | None = None) -> None:
        if ip is None:
            self._failures.clear()
        else:
            self._failures.pop(ip, None)


login_limiter = LoginRateLimiter()
