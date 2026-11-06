import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.auth.config import CALLBACK_PATH, api_public_url, google_client

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


def callback_uri() -> str:
    return f"{api_public_url()}{CALLBACK_PATH}"


def authorization_url(state: str) -> str:
    client_id, _ = google_client()
    params = {
        "client_id": client_id,
        "redirect_uri": callback_uri(),
        "response_type": "code",
        "scope": "openid email",
        "state": state,
        "prompt": "select_account",
    }
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def verified_email(code: str) -> str | None:
    """Exchange the authorization code and return the account email if Google verified it."""
    client_id, client_secret = google_client()
    form = urlencode(
        {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": callback_uri(),
            "grant_type": "authorization_code",
        }
    ).encode()
    token = _json(Request(TOKEN_URL, data=form, method="POST"))
    profile = _json(
        Request(USERINFO_URL, headers={"Authorization": f"Bearer {token['access_token']}"})
    )
    if profile.get("email_verified") is not True or not profile.get("email"):
        return None
    return str(profile["email"]).lower()


def _json(request: Request) -> dict:
    with urlopen(request, timeout=10) as response:
        return json.load(response)
