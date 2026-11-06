import pytest

from app.auth.config import SESSION_COOKIE
from app.auth.session import create_token

TEST_EMAIL = "owner@example.test"


@pytest.fixture(autouse=True)
def auth_settings(monkeypatch):
    monkeypatch.setenv("ORBITA_SESSION_SECRET", "s" * 32)
    monkeypatch.setenv("ORBITA_ALLOWED_EMAILS", TEST_EMAIL)
    monkeypatch.delenv("GOOGLE_CLIENT_ID", raising=False)
    monkeypatch.delenv("GOOGLE_CLIENT_SECRET", raising=False)


def sign_in(client, email: str = TEST_EMAIL):
    client.cookies.set(SESSION_COOKIE, create_token(email))
    return client
