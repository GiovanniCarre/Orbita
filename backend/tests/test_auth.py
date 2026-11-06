from urllib.parse import parse_qs, urlparse

import pytest
from conftest import TEST_EMAIL, sign_in
from fastapi.testclient import TestClient

from app.auth import google
from app.auth.config import DEFAULT_ALLOWED_EMAILS, SESSION_COOKIE, STATE_COOKIE
from app.auth.session import SESSION_DURATION, create_token, read_token
from app.main import create_app


@pytest.fixture
def client():
    return TestClient(create_app(["overview"]), follow_redirects=False)


@pytest.fixture
def google_configured(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "client-secret")


def test_only_the_owner_is_allowed_by_default(monkeypatch):
    monkeypatch.delenv("ORBITA_ALLOWED_EMAILS")
    assert DEFAULT_ALLOWED_EMAILS == "giovannicarre49@gmail.com"
    assert read_token(create_token("giovannicarre49@gmail.com")) == "giovannicarre49@gmail.com"
    assert read_token(create_token("someone@gmail.com")) is None


def test_api_requires_a_session(client):
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/integrations").status_code == 401
    assert client.get("/api/modules").status_code == 401
    assert client.get("/docs").status_code == 401
    assert client.get("/api/auth/me").status_code == 401


def test_session_gives_access(client):
    sign_in(client)
    assert client.get("/api/auth/me").json() == {"email": TEST_EMAIL}
    assert client.get("/api/integrations").status_code == 200


@pytest.mark.parametrize(
    "token",
    [
        create_token(TEST_EMAIL)[:-1] + "0",
        "garbage",
        "a.b.c",
    ],
)
def test_tampered_tokens_are_rejected(client, token):
    client.cookies.set(SESSION_COOKIE, token)
    assert client.get("/api/integrations").status_code == 401


def test_expired_and_revoked_sessions_are_rejected(monkeypatch):
    old = create_token(TEST_EMAIL, now=0)
    assert read_token(old, now=SESSION_DURATION + 1) is None
    token = create_token(TEST_EMAIL)
    monkeypatch.setenv("ORBITA_ALLOWED_EMAILS", "other@example.test")
    assert read_token(token) is None


def test_short_secret_disables_sessions(monkeypatch):
    token = create_token(TEST_EMAIL)
    monkeypatch.setenv("ORBITA_SESSION_SECRET", "short")
    assert read_token(token) is None


def test_login_reports_missing_configuration(client):
    response = client.get("/api/auth/google/login")
    assert response.headers["location"].endswith("/?auth=not_configured")


def test_login_redirects_to_google(client, google_configured):
    response = client.get("/api/auth/google/login")
    location = urlparse(response.headers["location"])
    assert location.netloc == "accounts.google.com"
    params = parse_qs(location.query)
    assert params["scope"] == ["openid email"]
    assert params["state"] == [response.cookies[STATE_COOKIE]]


def callback(client, monkeypatch, email):
    monkeypatch.setattr(google, "verified_email", lambda code: email)
    client.cookies.set(STATE_COOKIE, "state-value")
    return client.get("/api/auth/google/callback?code=abc&state=state-value")


def test_callback_signs_in_the_allowed_account(client, monkeypatch, google_configured):
    response = callback(client, monkeypatch, TEST_EMAIL)
    assert response.headers["location"].endswith("/")
    assert read_token(response.cookies[SESSION_COOKIE]) == TEST_EMAIL


def test_callback_refuses_other_accounts(client, monkeypatch, google_configured):
    response = callback(client, monkeypatch, "intruder@gmail.com")
    assert response.headers["location"].endswith("/?auth=denied")
    assert SESSION_COOKIE not in response.cookies


def test_callback_refuses_unverified_email(client, monkeypatch, google_configured):
    response = callback(client, monkeypatch, None)
    assert response.headers["location"].endswith("/?auth=denied")


def test_callback_requires_matching_state(client, monkeypatch, google_configured):
    monkeypatch.setattr(google, "verified_email", lambda code: TEST_EMAIL)
    client.cookies.set(STATE_COOKIE, "expected")
    response = client.get("/api/auth/google/callback?code=abc&state=forged")
    assert response.headers["location"].endswith("/?auth=failed")
    assert SESSION_COOKIE not in response.cookies


def test_logout_clears_the_session(client):
    sign_in(client)
    response = client.post("/api/auth/logout")
    assert response.status_code == 204
    assert 'orbita_session=""' in response.headers["set-cookie"]
