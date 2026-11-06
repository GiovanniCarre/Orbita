import secrets

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse

from app.auth import google
from app.auth.config import (
    CALLBACK_PATH,
    SESSION_COOKIE,
    STATE_COOKIE,
    allowed_emails,
    frontend_public_url,
    google_ready,
    secure_cookies,
)
from app.auth.session import SESSION_DURATION, create_token, current_email

router = APIRouter(prefix="/auth")


@router.get("/me")
def me(request: Request) -> dict[str, str]:
    email = current_email(request)
    if email is None:
        raise HTTPException(status_code=401, detail="Authentification requise")
    return {"email": email}


@router.get("/google/login")
def login() -> RedirectResponse:
    if not google_ready():
        return _back("not_configured")
    state = secrets.token_urlsafe(32)
    response = RedirectResponse(google.authorization_url(state), status_code=303)
    response.set_cookie(
        STATE_COOKIE,
        state,
        max_age=600,
        httponly=True,
        secure=secure_cookies(),
        samesite="lax",
        path=CALLBACK_PATH,
    )
    return response


@router.get("/google/callback")
def callback(request: Request, code: str = "", state: str = "") -> RedirectResponse:
    expected = request.cookies.get(STATE_COOKIE, "")
    if not (google_ready() and code and state and expected) or not secrets.compare_digest(
        state, expected
    ):
        return _back("failed", clear_state=True)
    try:
        email = google.verified_email(code)
    except Exception:
        return _back("failed", clear_state=True)
    if email is None or email not in allowed_emails():
        return _back("denied", clear_state=True)
    response = _back(None, clear_state=True)
    response.set_cookie(
        SESSION_COOKIE,
        create_token(email),
        max_age=SESSION_DURATION,
        httponly=True,
        secure=secure_cookies(),
        samesite="lax",
        path="/",
    )
    return response


@router.post("/logout", status_code=204)
def logout() -> Response:
    response = Response(status_code=204)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return response


def _back(outcome: str | None, clear_state: bool = False) -> RedirectResponse:
    suffix = f"/?auth={outcome}" if outcome else "/"
    response = RedirectResponse(f"{frontend_public_url()}{suffix}", status_code=303)
    if clear_state:
        response.delete_cookie(STATE_COOKIE, path=CALLBACK_PATH)
    return response
