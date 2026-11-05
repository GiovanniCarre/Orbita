import hashlib
import secrets

from app.modules.social.config import provider_config, provider_ready
from app.modules.social.providers import authorization_url, connect_accounts
from app.modules.social.repository import (
    consume_oauth_state,
    create_oauth_state,
    delete_account,
    list_accounts,
)


def availability() -> dict[str, bool]:
    return {name: provider_ready(name) for name in ("instagram", "facebook")}


def begin_connection(provider: str) -> tuple[str, str]:
    state = secrets.token_urlsafe(32)
    create_oauth_state(hashlib.sha256(state.encode()).hexdigest(), provider)
    return state, authorization_url(provider, provider_config(provider), state)


def finish_connection(provider: str, state: str) -> None:
    state_hash = hashlib.sha256(state.encode()).hexdigest()
    if not consume_oauth_state(state_hash, provider):
        raise ValueError("Invalid or expired OAuth state")


def exchange_code(provider: str, code: str) -> int:
    return connect_accounts(provider, provider_config(provider), code)


def accounts() -> list[dict[str, str]]:
    return list_accounts()


def disconnect(account_id: str) -> bool:
    return delete_account(account_id)
