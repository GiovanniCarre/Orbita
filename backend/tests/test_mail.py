import pytest
from conftest import sign_in
from fastapi.testclient import TestClient

from app.main import create_app
from app.modules.mail import google, routes


def test_mail_requires_session():
    client = TestClient(create_app(["mail"]))
    assert client.get("/api/mail/status").status_code == 401
    assert client.get("/api/mail/projects/sportcooks/messages").status_code == 401
    assert client.post("/api/mail/projects/sportcooks/send", json={}).status_code == 401


def test_unconfigured_and_unknown_project(monkeypatch):
    monkeypatch.setattr(routes, "ready", lambda: False)
    client = sign_in(TestClient(create_app(["mail"])))
    assert client.get("/api/mail/status").json() == {"configured": False, "connected": False}
    assert client.get("/api/mail/projects/other/messages").status_code == 404
    assert client.get("/api/mail/projects/sportcooks/messages").status_code == 503


def test_only_configured_project_can_query_google(monkeypatch):
    calls = []
    monkeypatch.setattr(routes, "ready", lambda: True)
    monkeypatch.setattr(routes.repository, "account_token", lambda email: "refresh")
    monkeypatch.setattr(google, "access_token", lambda token: "access")
    monkeypatch.setattr(google, "messages", lambda token, address: calls.append(address) or [])
    client = sign_in(TestClient(create_app(["mail"])))
    assert client.get("/api/mail/projects/other/messages").status_code == 404
    assert calls == []
    assert (
        client.get("/api/mail/projects/sportcooks/messages?account=user@gmail.com").status_code
        == 200
    )
    assert calls == ["contact@sportcooks.fr"]


def test_filter_rechecks_exact_recipient_and_does_not_return_unrelated_messages(monkeypatch):
    def get(path, token, params=None):
        if path == "/messages":
            return {"messages": [{"id": "a1"}, {"id": "b2"}]}
        recipient = "contact@sportcooks.fr" if path.endswith("a1") else "private@example.com"
        return {
            "payload": {
                "headers": [
                    {"name": "To", "value": recipient},
                    {"name": "Subject", "value": "Subject"},
                ]
            }
        }

    monkeypatch.setattr(google, "get", get)
    assert [message["id"] for message in google.messages("token", "contact@sportcooks.fr")] == [
        "a1"
    ]


def test_oauth_callback_rejects_missing_or_wrong_state(monkeypatch):
    monkeypatch.setattr(
        routes.repository, "consume_state", lambda state: (_ for _ in ()).throw(AssertionError())
    )
    client = sign_in(TestClient(create_app(["mail"])))
    result = client.get("/api/mail/google/callback?state=forged&code=code", follow_redirects=False)
    assert result.status_code == 303
    assert result.headers["location"].endswith("google=connection_failed")


def test_oauth_rejects_a_different_google_account(monkeypatch):
    monkeypatch.setattr(
        google,
        "token_request",
        lambda params: {
            "access_token": "access",
            "refresh_token": "refresh",
            "scope": google.SCOPE,
        },
    )
    monkeypatch.setattr(google, "get", lambda path, token: {"emailAddress": "other@gmail.com"})
    with pytest.raises(RuntimeError, match="Unexpected Gmail account"):
        google.exchange("code", "expected@gmail.com")


def test_send_requires_confirmation_and_prevents_repeated_attempts(monkeypatch):
    attempts = set()
    sent = []
    monkeypatch.setattr(routes, "ready", lambda: True)
    monkeypatch.setattr(routes.repository, "account_token", lambda email: "refresh")
    monkeypatch.setattr(google, "access_token", lambda token: "access")

    def claim(attempt, account, project, digest):
        if attempt in attempts:
            return False
        attempts.add(attempt)
        return True

    monkeypatch.setattr(routes.repository, "claim_send", claim)
    monkeypatch.setattr(routes.repository, "finish_send", lambda *args: None)
    monkeypatch.setattr(google, "send_message", lambda *args: sent.append(args) or "google-id")
    client = sign_in(TestClient(create_app(["mail"])))
    body = {
        "account": "a@gmail.com",
        "recipient": "b@example.com",
        "subject": "Hello",
        "body": "Bonjour",
        "attempt_id": "d4f08100-3356-4a75-95fb-662b1454f03e",
    }
    assert client.post("/api/mail/projects/sportcooks/send", json=body).status_code == 400
    assert sent == []
    body["confirmed"] = True
    assert client.post("/api/mail/projects/other/send", json=body).status_code == 404
    assert client.post("/api/mail/projects/sportcooks/send", json=body).status_code == 200
    assert client.post("/api/mail/projects/sportcooks/send", json=body).status_code == 409
    assert len(sent) == 1


def test_provider_failure_is_uncertain_and_not_replayed(monkeypatch):
    attempts = set()
    outcomes = []
    monkeypatch.setattr(routes, "ready", lambda: True)
    monkeypatch.setattr(routes.repository, "account_token", lambda email: "refresh")
    monkeypatch.setattr(google, "access_token", lambda token: "access")

    def claim(attempt, *args):
        if attempt in attempts:
            return False
        attempts.add(attempt)
        return True

    monkeypatch.setattr(routes.repository, "claim_send", claim)
    monkeypatch.setattr(
        routes.repository, "finish_send", lambda attempt, state: outcomes.append(state)
    )
    monkeypatch.setattr(google, "send_message", lambda *args: (_ for _ in ()).throw(TimeoutError()))
    client = sign_in(TestClient(create_app(["mail"])))
    body = {
        "account": "a@gmail.com",
        "recipient": "b@example.com",
        "subject": "Hello",
        "body": "Bonjour",
        "attempt_id": "d4f08100-3356-4a75-95fb-662b1454f03e",
        "confirmed": True,
    }
    assert client.post("/api/mail/projects/sportcooks/send", json=body).status_code == 502
    assert client.post("/api/mail/projects/sportcooks/send", json=body).status_code == 409
    assert outcomes == ["uncertain"]
