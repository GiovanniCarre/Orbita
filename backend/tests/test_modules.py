import os
import subprocess
import sys
from pathlib import Path

import pytest
from conftest import sign_in
from fastapi import APIRouter
from fastapi.testclient import TestClient

from app import main
from app.registry import Module, available_modules, configured_modules

BACKEND = Path(__file__).resolve().parents[1]


def test_every_module_package_is_discovered():
    assert available_modules() == ["overview", "social"]


def test_all_modules_are_enabled_by_default(monkeypatch):
    monkeypatch.delenv("ORBITA_MODULES", raising=False)
    assert configured_modules() == ["overview", "social"]


def test_setting_selects_modules(monkeypatch):
    monkeypatch.setenv("ORBITA_MODULES", " social , ")
    assert configured_modules() == ["social"]


def test_unknown_module_is_rejected():
    with pytest.raises(ValueError, match="missing"):
        main.create_app(["missing"])


def test_core_runs_without_modules():
    client = sign_in(TestClient(main.create_app([])))
    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.get("/api/modules").json() == {"modules": []}


def test_overview_runs_alone():
    client = sign_in(TestClient(main.create_app(["overview"])))
    assert client.get("/api/modules").json() == {"modules": ["overview"]}
    assert client.get("/api/integrations").status_code == 200
    assert client.get("/api/social/meta/availability").status_code == 404


def test_social_runs_alone():
    client = sign_in(TestClient(main.create_app(["social"])))
    assert client.get("/api/modules").json() == {"modules": ["social"]}
    assert client.get("/api/social/meta/availability").status_code == 200
    assert client.get("/api/integrations").status_code == 404


def test_disabled_module_is_never_imported():
    script = (
        "import sys, app.main; "
        "loaded = [name for name in sys.modules if name.startswith('app.modules.social')]; "
        "assert not loaded, loaded"
    )
    env = {**os.environ, "ORBITA_MODULES": "overview"}
    result = subprocess.run(
        [sys.executable, "-c", script], cwd=BACKEND, env=env, capture_output=True, text=True
    )
    assert result.returncode == 0, result.stderr


def test_startup_hooks_run_when_the_app_starts(monkeypatch):
    calls = []
    fake = Module(name="fake", router=APIRouter(), startup=(lambda: calls.append("fake"),))
    monkeypatch.setattr(main, "load_modules", lambda names: [fake])
    with TestClient(main.create_app(["fake"])):
        assert calls == ["fake"]
