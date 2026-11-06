"""Gmail connection and project-scoped read-only message listing."""

import hashlib
import json
import re
import secrets
from email.utils import getaddresses
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from app.modules.mail import google, repository
from app.modules.mail.config import callback_url, frontend_url, ready, setting

router = APIRouter(prefix="/mail")
STATE_COOKIE = "orbita_mail_oauth"
STATE_PATH = "/api/mail/google/callback"
EMAIL = re.compile(r"^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$")


class ConnectRequest(BaseModel):
    email: str = Field(max_length=254)


class SendRequest(BaseModel):
    account: str = Field(max_length=254)
    recipient: str = Field(max_length=254)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=100000)
    attempt_id: UUID
    reply_to_id: str | None = Field(default=None, max_length=100)
    confirmed: bool = False


def destination() -> str:
    return setting("GMAIL_SPORTCOOKS_ADDRESS", "contact@sportcooks.fr")


@router.get("/status")
def status() -> dict:
    if not ready():
        return {"configured": False, "connected": False}
    try:
        accounts = repository.list_accounts()
        return {"configured": True, "connected": bool(accounts), "accounts": accounts}
    except Exception as error:
        raise HTTPException(status_code=503, detail="Stockage Gmail indisponible") from error


@router.post("/google/connect")
def connect(body: ConnectRequest, response: Response) -> dict[str, str]:
    if not ready():
        raise HTTPException(status_code=503, detail="Connexion Google non configurée")
    email = body.email.strip().lower()
    if not EMAIL.fullmatch(email):
        raise HTTPException(status_code=400, detail="Adresse e-mail invalide")
    state = secrets.token_urlsafe(32)
    try:
        repository.create_state(state, email)
    except Exception as error:
        raise HTTPException(status_code=503, detail="Stockage Gmail indisponible") from error
    response.set_cookie(
        STATE_COOKIE,
        state,
        max_age=600,
        httponly=True,
        secure=callback_url().startswith("https://"),
        samesite="lax",
        path=STATE_PATH,
    )
    return {"authorization_url": google.authorization_url(state, email)}


@router.get("/google/callback")
def callback(
    request: Request, state: str = "", code: str = "", error: str = ""
) -> RedirectResponse:
    cookie = request.cookies.get(STATE_COOKIE, "")
    result = "connection_failed"
    if state and cookie and secrets.compare_digest(state, cookie):
        try:
            expected_email = repository.consume_state(state)
            if expected_email:
                if error or not code:
                    result = "cancelled"
                else:
                    email, refresh = google.exchange(code, expected_email)
                    repository.save_account(email, refresh)
                    result = "connected"
        except Exception:
            result = "connection_failed"
    response = RedirectResponse(f"{frontend_url()}/mail?google={result}", status_code=303)
    response.delete_cookie(STATE_COOKIE, path=STATE_PATH)
    return response


@router.get("/projects/{project}/messages")
def list_messages(project: str, account: str = "") -> dict:
    if project != "sportcooks":
        raise HTTPException(status_code=404, detail="Projet inconnu")
    if not ready():
        raise HTTPException(status_code=503, detail="Connexion Google non configurée")
    try:
        refresh = repository.account_token(account)
        if not refresh:
            raise HTTPException(status_code=409, detail="Compte Gmail non connecté")
        items = google.messages(google.access_token(refresh), destination())
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=503, detail="Gmail indisponible ou connexion expirée"
        ) from error
    return {"project": "sportcooks", "destination": destination(), "messages": items}


@router.get("/projects/{project}/messages/{message_id}")
def read_message(project: str, message_id: str, account: str) -> dict:
    if project != "sportcooks":
        raise HTTPException(status_code=404, detail="Projet inconnu")
    if not ready():
        raise HTTPException(status_code=503, detail="Connexion Google non configurée")
    try:
        refresh = repository.account_token(account)
        if not refresh:
            raise HTTPException(status_code=404, detail="Compte inconnu")
        message = google.read_message(google.access_token(refresh), message_id, destination())
        result = {key: message[key] for key in ("id", "from", "subject", "date", "body")}
        addresses = getaddresses([message["reply_to"]])
        result["reply_to"] = addresses[0][1] if len(addresses) == 1 else ""
        return result
    except (PermissionError, ValueError) as error:
        raise HTTPException(status_code=404, detail="Message introuvable") from error
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=503, detail="Impossible de lire le message") from error


@router.post("/projects/{project}/send")
def send(project: str, data: SendRequest) -> dict:
    if project != "sportcooks":
        raise HTTPException(status_code=404, detail="Projet inconnu")
    if not ready():
        raise HTTPException(status_code=503, detail="Connexion Google non configurée")
    if not data.confirmed:
        raise HTTPException(status_code=400, detail="Confirmation requise avant l’envoi")
    if not EMAIL.fullmatch(data.recipient) or any(c in data.subject for c in "\r\n"):
        raise HTTPException(status_code=400, detail="Destinataire ou objet invalide")
    try:
        refresh = repository.account_token(data.account)
        if not refresh:
            raise HTTPException(status_code=404, detail="Compte inconnu")
        token = google.access_token(refresh)
        original = None
        if data.reply_to_id:
            original = google.read_message(token, data.reply_to_id, destination())
            recipients = [address.lower() for _, address in getaddresses([original["reply_to"]])]
            expected_subject = original["subject"]
            if not expected_subject.lower().startswith("re:"):
                expected_subject = "Re: " + expected_subject
            if recipients != [data.recipient.lower()] or data.subject != expected_subject:
                raise HTTPException(
                    status_code=400, detail="Réponse différente du message d’origine"
                )
        payload = data.model_dump(exclude={"attempt_id", "confirmed"})
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
        attempt = str(data.attempt_id)
        if not repository.claim_send(attempt, data.account, project, digest):
            raise HTTPException(
                status_code=409, detail="Cette tentative a déjà été traitée ou reste incertaine"
            )
        try:
            provider_id = google.send_message(
                token, data.account, data.recipient, data.subject, data.body, original
            )
            repository.finish_send(attempt, "sent", provider_id)
        except Exception as error:
            repository.finish_send(attempt, "uncertain")
            raise HTTPException(
                status_code=502,
                detail="Envoi incertain : vérifie les messages envoyés avant de réessayer",
            ) from error
        return {"status": "sent", "id": provider_id}
    except HTTPException:
        raise
    except (ValueError, PermissionError) as error:
        raise HTTPException(status_code=404, detail="Message introuvable") from error
    except Exception as error:
        raise HTTPException(status_code=503, detail="Connexion Gmail indisponible") from error


@router.delete("/google/account", status_code=204)
def disconnect(account: str) -> Response:
    if not ready():
        raise HTTPException(status_code=503, detail="Connexion Google non configurée")
    try:
        repository.delete_account(account)
    except Exception as error:
        raise HTTPException(status_code=503, detail="Stockage Gmail indisponible") from error
    return Response(status_code=204)
