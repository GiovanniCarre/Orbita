"""Cross-platform entry point used by the Windows wrappers and CI."""

import os
import subprocess
import sys
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENV = ROOT / ".venv"
PYTHON = VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
NPM = "npm.cmd" if os.name == "nt" else "npm"


def run(*args: str, cwd: Path = ROOT, env: dict | None = None) -> None:
    print("+", *args, flush=True)
    subprocess.run(args, cwd=cwd, env=env, check=True)


def dependencies() -> None:
    if not PYTHON.exists():
        venv.create(VENV, with_pip=True)
    run(str(PYTHON), "-m", "pip", "install", "-r", "backend/requirements-dev.txt")
    run(NPM, "ci", "--no-audit", "--no-fund", cwd=ROOT / "frontend")


def npm(*args: str) -> None:
    run(NPM, "run", *args, cwd=ROOT / "frontend")


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in {
        "run",
        "format",
        "test",
        "e2e",
        "quality",
        "agent",
    }:
        sys.exit("Usage: python scripts/tasks.py run|format|test|e2e|quality|agent")
    task = sys.argv[1]
    if task == "agent":
        print((ROOT / "AGENTS.md").read_text(encoding="utf-8"))
        print((ROOT / "docs/architecture.md").read_text(encoding="utf-8"))
        return
    if task == "run":
        run("docker", "compose", "up", "--build", "-d")
        return
    dependencies()
    if task == "format":
        run(str(PYTHON), "-m", "ruff", "check", "--fix", "backend", "scripts", "tests")
        run(str(PYTHON), "-m", "ruff", "format", "backend", "scripts", "tests")
        npm("format")
    elif task == "test":
        run(str(PYTHON), "-m", "pytest", cwd=ROOT / "backend")
        run(str(PYTHON), "-m", "unittest", "discover", "-s", "tests", "-v")
        npm("test")
    elif task == "e2e":
        env = {**os.environ, "ORBITA_PYTHON": str(PYTHON)}
        run(NPM, "run", "e2e", cwd=ROOT / "frontend", env=env)
    else:
        run(str(PYTHON), "scripts/quality.py")
        run(str(PYTHON), "-m", "pip", "check")
        run(str(PYTHON), "-m", "ruff", "check", "backend", "scripts", "tests")
        run(
            str(PYTHON),
            "-m",
            "ruff",
            "format",
            "--check",
            "backend",
            "scripts",
            "tests",
        )
        npm("format:check")
        npm("check")
        npm("build")


if __name__ == "__main__":
    main()
