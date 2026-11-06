import hmac
import threading
import time

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from app.auth.config import (
    SESSION_COOKIE,
    login_email,
    login_ready,
    password_hash,
    secure_cookies,
)
from app.auth.password import verify_password
from app.auth.session import SESSION_DURATION, create_token, current_email

MAX_FAILURES = 5
FAILURE_WINDOW = 15 * 60

router = APIRouter(prefix="/auth")
_failures: dict[str, list[float]] = {}
_lock = threading.Lock()


class Credentials(BaseModel):
    email: str
    password: str


@router.get("/me")
def me(request: Request) -> dict[str, str]:
    email = current_email(request)
    if email is None:
        raise HTTPException(status_code=401, detail="Authentification requise")
    return {"email": email}


@router.post("/login")
def login(credentials: Credentials, request: Request, response: Response) -> dict[str, str]:
    if not login_ready():
        raise HTTPException(status_code=503, detail="Connexion non configurée")
    client = request.client.host if request.client else "unknown"
    if _blocked(client):
        raise HTTPException(status_code=429, detail="Trop de tentatives")
    email = credentials.email.strip().lower()
    # Always verify the password so a wrong email takes as long as a wrong password.
    valid_password = verify_password(credentials.password, password_hash())
    if not (valid_password and hmac.compare_digest(email, login_email())):
        _record_failure(client)
        raise HTTPException(status_code=401, detail="Adresse ou mot de passe incorrect")
    with _lock:
        _failures.pop(client, None)
    response.set_cookie(
        SESSION_COOKIE,
        create_token(email),
        max_age=SESSION_DURATION,
        httponly=True,
        secure=secure_cookies(),
        samesite="lax",
        path="/",
    )
    return {"email": email}


@router.post("/logout", status_code=204)
def logout() -> Response:
    response = Response(status_code=204)
    response.delete_cookie(SESSION_COOKIE, path="/")
    return response


def _blocked(client: str) -> bool:
    with _lock:
        recent = [
            moment for moment in _failures.get(client, []) if moment > time.time() - FAILURE_WINDOW
        ]
        _failures[client] = recent
        return len(recent) >= MAX_FAILURES


def _record_failure(client: str) -> None:
    with _lock:
        _failures.setdefault(client, []).append(time.time())
