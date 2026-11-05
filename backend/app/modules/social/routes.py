import secrets
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse

from app.modules.social.config import (
    API_PUBLIC_URL,
    FRONTEND_PUBLIC_URL,
    provider_ready,
)
from app.modules.social.service import (
    accounts,
    availability,
    begin_connection,
    disconnect,
    exchange_code,
    finish_connection,
)

router = APIRouter(prefix="/social")
PROVIDERS = {"instagram", "facebook"}


@router.get("/meta/availability")
def get_availability() -> dict[str, bool]:
    return availability()


@router.get("/accounts")
def get_accounts() -> list[dict[str, str]]:
    try:
        return accounts()
    except Exception as error:
        raise HTTPException(status_code=503, detail="Stockage social indisponible") from error


@router.get("/meta/{provider}/connect")
def connect(provider: str, response: Response) -> dict[str, str]:
    _check_provider(provider)
    if not provider_ready(provider):
        raise HTTPException(status_code=503, detail="Connexion Meta non configurée")
    try:
        state, url = begin_connection(provider)
    except Exception as error:
        raise HTTPException(status_code=503, detail="Stockage social indisponible") from error
    response.set_cookie(
        key=f"orbita_oauth_{provider}",
        value=state,
        max_age=600,
        httponly=True,
        secure=API_PUBLIC_URL.startswith("https://"),
        samesite="lax",
        path=f"/api/social/meta/{provider}/callback",
    )
    return {"authorization_url": url}


@router.get("/meta/{provider}/callback")
def callback(
    provider: str,
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
) -> RedirectResponse:
    _check_provider(provider)
    cookie_state = request.cookies.get(f"orbita_oauth_{provider}", "")
    valid_state = bool(state and cookie_state and secrets.compare_digest(state, cookie_state))
    redirect = RedirectResponse(f"{FRONTEND_PUBLIC_URL}/social", status_code=303)
    redirect.delete_cookie(f"orbita_oauth_{provider}", path=f"/api/social/meta/{provider}/callback")
    if not valid_state or not state:
        return _result(redirect, "oauth_state_invalid")
    try:
        finish_connection(provider, state)
        if error or not code:
            return _result(redirect, "oauth_cancelled")
        if not exchange_code(provider, code):
            return _result(redirect, "no_accounts")
        return _result(redirect, "connected")
    except (ValueError, RuntimeError):
        return _result(redirect, "connection_failed")
    except Exception:
        return _result(redirect, "connection_failed")


@router.delete("/accounts/{account_id}", status_code=204)
def remove_account(account_id: str) -> Response:
    try:
        removed = disconnect(account_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Identifiant invalide") from error
    except Exception as error:
        raise HTTPException(status_code=503, detail="Stockage social indisponible") from error
    if not removed:
        raise HTTPException(status_code=404, detail="Compte introuvable")
    return Response(status_code=204)


def _check_provider(provider: str) -> None:
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Fournisseur inconnu")


def _result(response: RedirectResponse, outcome: str) -> RedirectResponse:
    response.headers["location"] = f"{FRONTEND_PUBLIC_URL}/social?{urlencode({'meta': outcome})}"
    return response
