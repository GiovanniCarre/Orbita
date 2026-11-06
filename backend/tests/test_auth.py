import pytest
from conftest import TEST_EMAIL, TEST_PASSWORD, sign_in
from fastapi.testclient import TestClient

from app.auth.config import DEFAULT_LOGIN_EMAIL, SESSION_COOKIE
from app.auth.password import hash_password, verify_password
from app.auth.routes import MAX_FAILURES
from app.auth.session import SESSION_DURATION, create_token, read_token
from app.main import create_app


@pytest.fixture
def client():
    return TestClient(create_app(["overview"]))


def log_in(client, email=TEST_EMAIL, password=TEST_PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_owner_account_is_the_default(monkeypatch):
    monkeypatch.delenv("ORBITA_LOGIN_EMAIL")
    assert DEFAULT_LOGIN_EMAIL == "giovannicarre49@gmail.com"
    assert read_token(create_token(DEFAULT_LOGIN_EMAIL)) == DEFAULT_LOGIN_EMAIL


def test_password_hashes_are_salted_and_verified():
    first, second = hash_password("a long password"), hash_password("a long password")
    assert first != second and "$" not in first
    assert verify_password("a long password", first)
    assert not verify_password("another password", first)
    assert not verify_password("a long password", "garbage")


def test_api_requires_a_session(client):
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/integrations").status_code == 401
    assert client.get("/api/modules").status_code == 401
    assert client.get("/docs").status_code == 401
    assert client.get("/api/auth/me").status_code == 401


def test_login_opens_a_session(client):
    response = log_in(client, email=" Owner@Example.test ")
    assert response.json() == {"email": TEST_EMAIL}
    assert "httponly" in response.headers["set-cookie"].lower()
    assert client.get("/api/auth/me").json() == {"email": TEST_EMAIL}
    assert client.get("/api/integrations").status_code == 200


@pytest.mark.parametrize(
    ("email", "password"),
    [(TEST_EMAIL, "wrong password"), ("intruder@example.test", TEST_PASSWORD)],
)
def test_wrong_credentials_are_refused(client, email, password):
    response = log_in(client, email, password)
    assert response.status_code == 401
    assert SESSION_COOKIE not in response.cookies


def test_repeated_failures_are_throttled(client):
    for _ in range(MAX_FAILURES):
        assert log_in(client, password="wrong").status_code == 401
    assert log_in(client).status_code == 429


def test_login_requires_configuration(client, monkeypatch):
    monkeypatch.delenv("ORBITA_PASSWORD_HASH")
    assert log_in(client).status_code == 503


def test_session_gives_access(client):
    sign_in(client)
    assert client.get("/api/auth/me").json() == {"email": TEST_EMAIL}


@pytest.mark.parametrize("token", [create_token(TEST_EMAIL)[:-1] + "0", "garbage", "a.b.c"])
def test_tampered_tokens_are_rejected(client, token):
    client.cookies.set(SESSION_COOKIE, token)
    assert client.get("/api/integrations").status_code == 401


def test_expired_sessions_are_rejected():
    assert read_token(create_token(TEST_EMAIL, now=0), now=SESSION_DURATION + 1) is None


def test_changing_account_or_password_revokes_sessions(monkeypatch):
    token = create_token(TEST_EMAIL)
    monkeypatch.setenv("ORBITA_PASSWORD_HASH", hash_password("a new password"))
    assert read_token(token) is None
    monkeypatch.setenv("ORBITA_LOGIN_EMAIL", "other@example.test")
    assert read_token(create_token(TEST_EMAIL)) is None


def test_short_secret_disables_sessions(monkeypatch):
    token = create_token(TEST_EMAIL)
    monkeypatch.setenv("ORBITA_SESSION_SECRET", "short")
    assert read_token(token) is None


def test_logout_clears_the_session(client):
    sign_in(client)
    response = client.post("/api/auth/logout")
    assert response.status_code == 204
    assert 'orbita_session=""' in response.headers["set-cookie"]
