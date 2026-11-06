"""Stateless session tokens: base64url(JSON payload) + "." + HMAC-SHA256 signature."""

import base64
import hashlib
import hmac
import json
import time

from fastapi import Request

from app.auth.config import SESSION_COOKIE, allowed_emails, session_secret

SESSION_DURATION = 30 * 24 * 3600


def create_token(email: str, now: float | None = None) -> str:
    expires = int((time.time() if now is None else now) + SESSION_DURATION)
    payload = json.dumps({"email": email.lower(), "exp": expires}).encode()
    encoded = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    return f"{encoded}.{_sign(encoded)}"


def read_token(token: str, now: float | None = None) -> str | None:
    """Return the email of a valid, unexpired session for an allowed account."""
    if len(session_secret()) < 32 or token.count(".") != 1:
        return None
    encoded, signature = token.split(".")
    if not hmac.compare_digest(signature, _sign(encoded)):
        return None
    try:
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        email, expires = str(payload["email"]), int(payload["exp"])
    except (ValueError, KeyError, TypeError):
        return None
    if expires <= (time.time() if now is None else now) or email not in allowed_emails():
        return None
    return email


def current_email(request: Request) -> str | None:
    return read_token(request.cookies.get(SESSION_COOKIE, ""))


def _sign(encoded: str) -> str:
    return hmac.new(session_secret().encode(), encoded.encode(), hashlib.sha256).hexdigest()
