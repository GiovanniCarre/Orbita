"""Gmail API client; never expose provider tokens."""

import base64
import json
from email.message import EmailMessage
from email.utils import getaddresses
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

from app.modules.mail.config import callback_url, setting

SCOPE = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send"
TOKEN_URL = "https://oauth2.googleapis.com/token"
API = "https://gmail.googleapis.com/gmail/v1/users/me"


def authorization_url(state: str, email: str) -> str:
    params = {
        "client_id": setting("GMAIL_CLIENT_ID"),
        "redirect_uri": callback_url(),
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
        "login_hint": email,
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


def token_request(params: dict[str, str]) -> dict:
    data = {
        "client_id": setting("GMAIL_CLIENT_ID"),
        "client_secret": setting("GMAIL_CLIENT_SECRET"),
        **params,
    }
    return request_json(Request(TOKEN_URL, data=urlencode(data).encode(), method="POST"))


def exchange(code: str, expected_email: str) -> tuple[str, str]:
    response = token_request(
        {"code": code, "redirect_uri": callback_url(), "grant_type": "authorization_code"}
    )
    if not set(SCOPE.split()).issubset(set(str(response.get("scope", "")).split())):
        raise RuntimeError("Google did not grant the requested permissions")
    access, refresh = response.get("access_token"), response.get("refresh_token")
    if not isinstance(access, str) or not isinstance(refresh, str):
        raise RuntimeError("Google did not return credentials")
    profile = get("/profile", access)
    email = profile.get("emailAddress", "")
    if not isinstance(email, str) or email.casefold() != expected_email.casefold():
        raise RuntimeError("Unexpected Gmail account")
    return email, refresh


def access_token(refresh: str) -> str:
    token = token_request({"refresh_token": refresh, "grant_type": "refresh_token"}).get(
        "access_token"
    )
    if not isinstance(token, str):
        raise RuntimeError("Google did not return an access token")
    return token


def get(path: str, token: str, params: list[tuple[str, str]] | None = None) -> dict:
    url = f"{API}{path}"
    if params:
        url += "?" + urlencode(params)
    return request_json(Request(url, headers={"Authorization": f"Bearer {token}"}))


def request_json(request: Request) -> dict:
    try:
        with urlopen(request, timeout=15) as response:
            value = json.load(response)
    except (HTTPError, URLError, TimeoutError, ValueError) as error:
        raise RuntimeError("Google API unavailable") from error
    if not isinstance(value, dict):
        raise RuntimeError("Unexpected Google API response")
    return value


def messages(token: str, destination: str) -> list[dict]:
    # Project queries are server-controlled, never accepted from the client.
    data = get(
        "/messages", token, [("maxResults", "30"), ("q", f"{{to:{destination} cc:{destination}}}")]
    )
    result = []
    for item in data.get("messages", []):
        message_id = item.get("id", "")
        if not isinstance(message_id, str) or not message_id.isalnum():
            continue
        entry = get(
            "/messages/" + quote(message_id, safe=""),
            token,
            [
                ("format", "metadata"),
                ("metadataHeaders", "From"),
                ("metadataHeaders", "To"),
                ("metadataHeaders", "Cc"),
                ("metadataHeaders", "Subject"),
                ("metadataHeaders", "Date"),
            ],
        )
        headers = entry.get("payload", {}).get("headers", [])
        recipients = [
            h.get("value", "") for h in headers if h.get("name", "").lower() in {"to", "cc"}
        ]
        if destination.casefold() not in {
            address.casefold() for _, address in getaddresses(recipients)
        }:
            continue
        values = {h.get("name", "").lower(): h.get("value", "") for h in headers}
        result.append(
            {
                "id": message_id,
                "from": values.get("from", ""),
                "subject": values.get("subject", "(sans objet)"),
                "date": values.get("date", ""),
                "unread": "UNREAD" in entry.get("labelIds", []),
            }
        )
    return result


def read_message(token: str, message_id: str, destination: str) -> dict:
    if not message_id.isalnum():
        raise ValueError("Invalid message id")
    entry = get("/messages/" + quote(message_id, safe=""), token, [("format", "full")])
    payload = entry.get("payload", {})
    headers = payload.get("headers", [])
    values = {h.get("name", "").lower(): h.get("value", "") for h in headers}
    recipients = [h.get("value", "") for h in headers if h.get("name", "").lower() in {"to", "cc"}]
    if destination.casefold() not in {
        address.casefold() for _, address in getaddresses(recipients)
    }:
        raise PermissionError("Message is outside the project")
    return {
        "id": message_id,
        "thread_id": entry.get("threadId", ""),
        "from": values.get("from", ""),
        "reply_to": values.get("reply-to", values.get("from", "")),
        "subject": values.get("subject", ""),
        "date": values.get("date", ""),
        "message_id": values.get("message-id", ""),
        "references": values.get("references", ""),
        "body": _plain_text(payload),
    }


def _plain_text(part: dict) -> str:
    if part.get("mimeType", "").lower() == "text/plain":
        data = part.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4)).decode(
                "utf-8", "replace"
            )
    for child in part.get("parts", []):
        text = _plain_text(child)
        if text:
            return text
    return ""


def send_message(
    token: str, account: str, recipient: str, subject: str, body: str, original: dict | None = None
) -> str:
    message = EmailMessage()
    message["From"] = account
    message["To"] = recipient
    message["Subject"] = subject
    request_body = {}
    if original:
        if not original.get("message_id") or not original.get("thread_id"):
            raise ValueError("Original message has no reply headers")
        message["In-Reply-To"] = original["message_id"]
        message["References"] = (
            original.get("references", "") + " " + original["message_id"]
        ).strip()
        request_body["threadId"] = original["thread_id"]
    message.set_content(body)
    request_body["raw"] = base64.urlsafe_b64encode(message.as_bytes()).decode("ascii")
    request = Request(
        API + "/messages/send",
        data=json.dumps(request_body).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    response = request_json(request)
    provider_id = response.get("id")
    if not isinstance(provider_id, str) or not provider_id:
        raise RuntimeError("Google did not confirm sending")
    return provider_id
