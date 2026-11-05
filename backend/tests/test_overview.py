from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_reports_only_api_status():
    assert client.get("/api/health").json() == {"status": "ok"}


def test_integrations_do_not_claim_to_be_connected():
    response = client.get("/api/integrations")
    assert response.status_code == 200
    items = response.json()
    assert {item["id"] for item in items} == {"sportcooks", "monitoring", "notifications"}
    assert all(item["status"] == "not_configured" for item in items)
