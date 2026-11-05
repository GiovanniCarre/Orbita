"""Enforce repository boundaries and structural limits on maintained source files."""

import ast
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTENSIONS = {".py", ".ts", ".js", ".svelte", ".html", ".cmd"}
IGNORE = {
    ".git",
    ".venv",
    "__pycache__",
    "node_modules",
    ".svelte-kit",
    ".pytest_cache",
    ".ruff_cache",
    "target",
    "dist",
    "build",
    "test-results",
    "playwright-report",
}


def check() -> list[str]:
    errors = []
    for name, dirs, names in os.walk(ROOT):
        dirs[:] = [directory for directory in dirs if directory not in IGNORE]
        directory = Path(name)
        files = [
            directory / item
            for item in names
            if item != ".env" and not item.endswith(".tsbuildinfo")
        ]
        if len(files) >= 12:
            errors.append(
                f"{directory.relative_to(ROOT)} : {len(files)} fichiers directs"
            )
        for path in files:
            if path.suffix not in EXTENSIONS:
                continue
            text = path.read_text(encoding="utf-8")
            if len(text.splitlines()) >= 300:
                errors.append(f"{path.relative_to(ROOT)} : 300 lignes ou plus")
            if path.suffix in {".ts", ".svelte"} and re.search(r"\bany\b", text):
                errors.append(f"{path.relative_to(ROOT)} : 'any' interdit")
            check_imports(path, text, errors)
    package = json.loads((ROOT / "frontend/package.json").read_text(encoding="utf-8"))
    for group in ("dependencies", "devDependencies"):
        for name, version in package.get(group, {}).items():
            if not re.fullmatch(r"\d+\.\d+\.\d+", version):
                errors.append(f"{name} : version non exacte ({version})")
    for path in (ROOT / "backend").glob("requirements*.txt"):
        for line in path.read_text(encoding="utf-8").splitlines():
            if (
                line
                and not line.startswith(("#", "-r "))
                and not re.fullmatch(r"[\w.-]+==\d+\.\d+\.\d+", line)
            ):
                errors.append(f"{path.name} : version non exacte ({line})")
    return errors


def check_imports(path: Path, text: str, errors: list[str]) -> None:
    modules = ROOT / "backend/app/modules"
    if path.suffix != ".py" or not path.is_relative_to(modules):
        return
    current = path.relative_to(modules).parts[0]
    for node in ast.walk(ast.parse(text, filename=str(path))):
        names = []
        if isinstance(node, ast.Import):
            names = [item.name for item in node.names]
        elif isinstance(node, ast.ImportFrom) and node.module:
            names = [node.module]
            if node.module == "app.modules":
                names += [f"app.modules.{item.name}" for item in node.names]
        if isinstance(node, ast.ImportFrom) and node.level > 1:
            errors.append(
                f"{path.relative_to(ROOT)} : import relatif hors module interdit"
            )
        for name in names:
            match = re.match(r"app\.modules\.([a-zA-Z_][\w]*)", name)
            if match and match.group(1) != current:
                errors.append(f"{path.relative_to(ROOT)} : import interdit vers {name}")


if __name__ == "__main__":
    violations = check()
    print(
        "\n".join(violations) if violations else "Structure et versions déclarées : OK"
    )
    sys.exit(bool(violations))
