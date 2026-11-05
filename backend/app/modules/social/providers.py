import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.modules.social.config import GRAPH_VERSION, ProviderConfig, callback_uri

INSTAGRAM_SCOPES = "instagram_business_basic,instagram_business_content_publish"
FACEBOOK_SCOPES = "pages_show_list,pages_read_engagement,pages_manage_posts"


def authorization_url(provider: str, config: ProviderConfig, state: str) -> str:
    redirect = callback_uri(provider)
    if provider == "instagram":
        params = {
            "client_id": config.app_id,
            "redirect_uri": redirect,
            "response_type": "code",
            "scope": INSTAGRAM_SCOPES,
            "state": state,
        }
        return f"https://www.instagram.com/oauth/authorize?{urlencode(params)}"
    params = {
        "client_id": config.app_id,
        "redirect_uri": redirect,
        "response_type": "code",
        "scope": FACEBOOK_SCOPES,
        "state": state,
    }
    return f"https://www.facebook.com/{GRAPH_VERSION}/dialog/oauth?{urlencode(params)}"


def connect_accounts(provider: str, config: ProviderConfig, code: str) -> int:
    if provider == "instagram":
        return _connect_instagram(config, code)
    return _connect_facebook(config, code)


def _connect_instagram(config: ProviderConfig, code: str) -> int:
    short_token = _request(
        "https://api.instagram.com/oauth/access_token",
        {
            "client_id": config.app_id,
            "client_secret": config.app_secret,
            "grant_type": "authorization_code",
            "redirect_uri": callback_uri("instagram"),
            "code": code,
        },
    )
    token = _request(
        "https://graph.instagram.com/access_token",
        {
            "grant_type": "ig_exchange_token",
            "client_secret": config.app_secret,
            "access_token": short_token["access_token"],
        },
        method="GET",
    )
    profile = _request(
        "https://graph.instagram.com/me",
        {"fields": "user_id,username", "access_token": token["access_token"]},
        method="GET",
    )
    provider_id = str(profile.get("user_id") or profile["id"])
    from app.modules.social.repository import save_account

    save_account(
        "instagram",
        provider_id,
        profile.get("username", provider_id),
        token["access_token"],
    )
    return 1


def _connect_facebook(config: ProviderConfig, code: str) -> int:
    short_token = _request(
        f"https://graph.facebook.com/{GRAPH_VERSION}/oauth/access_token",
        {
            "client_id": config.app_id,
            "client_secret": config.app_secret,
            "redirect_uri": callback_uri("facebook"),
            "code": code,
        },
        method="GET",
    )
    user_token = _request(
        f"https://graph.facebook.com/{GRAPH_VERSION}/oauth/access_token",
        {
            "grant_type": "fb_exchange_token",
            "client_id": config.app_id,
            "client_secret": config.app_secret,
            "fb_exchange_token": short_token["access_token"],
        },
        method="GET",
    )
    pages = _request(
        f"https://graph.facebook.com/{GRAPH_VERSION}/me/accounts",
        {
            "fields": "id,name,access_token",
            "access_token": user_token["access_token"],
        },
        method="GET",
    )
    from app.modules.social.repository import save_account

    for page in pages.get("data", []):
        save_account("facebook", str(page["id"]), page["name"], page["access_token"])
    return len(pages.get("data", []))


def _request(url: str, params: dict[str, str], method: str = "POST") -> dict:
    encoded = urlencode(params).encode()
    target = f"{url}?{encoded.decode()}" if method == "GET" else url
    request = Request(target, data=encoded if method == "POST" else None, method=method)
    try:
        with urlopen(request, timeout=20) as response:
            payload = json.loads(response.read())
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError("Meta API request failed") from error
    if not isinstance(payload, dict) or "error" in payload:
        raise RuntimeError("Meta API request failed")
    return payload
