import pytest
from conftest import sign_in
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    (tmp_path / "index.html").write_text("<html>orbita</html>")
    assets = tmp_path / "_app" / "immutable"
    assets.mkdir(parents=True)
    (assets / "app.js").write_text("console.log('orbita')")
    (tmp_path.parent / "secret.txt").write_text("secret")
    monkeypatch.setenv("ORBITA_STATIC_DIR", str(tmp_path))
    return TestClient(create_app(["overview"]))


def test_interface_is_served_without_a_session(client):
    assert client.get("/").text == "<html>orbita</html>"
    assert client.get("/social").text == "<html>orbita</html>"


def test_compiled_assets_are_cached(client):
    response = client.get("/_app/immutable/app.js")
    assert response.text == "console.log('orbita')"
    assert "immutable" in response.headers["cache-control"]


def test_files_outside_the_build_are_not_served(client):
    assert "secret" not in client.get("/../secret.txt").text
    assert "secret" not in client.get("/%2e%2e/secret.txt").text


def test_api_stays_protected_and_unknown_routes_are_not_the_app(client):
    assert client.get("/api/integrations").status_code == 401
    assert client.get("/openapi.json").status_code == 401
    sign_in(client)
    assert client.get("/api/integrations").status_code == 200
    assert client.get("/api/unknown").status_code == 404


def test_missing_build_is_reported(tmp_path, monkeypatch):
    monkeypatch.setenv("ORBITA_STATIC_DIR", str(tmp_path / "missing"))
    with pytest.raises(RuntimeError, match="index.html"):
        create_app(["overview"])
