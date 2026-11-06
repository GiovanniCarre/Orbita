"""Contract between the application core and its feature modules.

Each package in ``app.modules`` exposes a ``MODULE`` object in its ``module.py``.
The core only imports the modules enabled by ``ORBITA_MODULES``.
"""

import importlib
import os
import pkgutil
from collections.abc import Callable, Iterable
from dataclasses import dataclass

from fastapi import APIRouter

import app.modules


@dataclass(frozen=True)
class Module:
    name: str
    router: APIRouter
    startup: tuple[Callable[[], None], ...] = ()


def available_modules() -> list[str]:
    return sorted(info.name for info in pkgutil.iter_modules(app.modules.__path__) if info.ispkg)


def configured_modules() -> list[str]:
    """Modules listed in ORBITA_MODULES, or every available module when unset."""
    setting = os.getenv("ORBITA_MODULES", "")
    names = [name.strip() for name in setting.split(",") if name.strip()]
    return names or available_modules()


def load_modules(names: Iterable[str]) -> list[Module]:
    requested = list(dict.fromkeys(names))
    unknown = sorted(set(requested) - set(available_modules()))
    if unknown:
        raise ValueError(f"Unknown Orbita modules: {', '.join(unknown)}")
    return [_load(name) for name in requested]


def _load(name: str) -> Module:
    module = importlib.import_module(f"app.modules.{name}.module").MODULE
    if not isinstance(module, Module) or module.name != name:
        raise ValueError(f"app.modules.{name}.module must define MODULE named '{name}'")
    return module
