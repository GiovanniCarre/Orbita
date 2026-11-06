import pytest

from app.auth import routes
from app.auth.config import SESSION_COOKIE
from app.auth.password import hash_password
from app.auth.session import create_token

TEST_EMAIL = "owner@example.test"
TEST_PASSWORD = "correct horse battery staple"
TEST_HASH = hash_password(TEST_PASSWORD)


@pytest.fixture(autouse=True)
def auth_settings(monkeypatch):
    monkeypatch.setenv("ORBITA_SESSION_SECRET", "s" * 32)
    monkeypatch.setenv("ORBITA_LOGIN_EMAIL", TEST_EMAIL)
    monkeypatch.setenv("ORBITA_PASSWORD_HASH", TEST_HASH)
    routes._failures.clear()


def sign_in(client, email: str = TEST_EMAIL):
    client.cookies.set(SESSION_COOKIE, create_token(email))
    return client
