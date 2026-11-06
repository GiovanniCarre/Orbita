from collections.abc import AsyncIterator, Iterable
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.registry import configured_modules, load_modules


def create_app(module_names: Iterable[str] | None = None) -> FastAPI:
    modules = load_modules(configured_modules() if module_names is None else module_names)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        for module in modules:
            for hook in module.startup:
                hook()
        yield

    application = FastAPI(title="Orbita", version="0.1.0", lifespan=lifespan)

    @application.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @application.get("/api/modules")
    def enabled_modules() -> dict[str, list[str]]:
        return {"modules": [module.name for module in modules]}

    for module in modules:
        application.include_router(module.router, prefix="/api")
    return application


app = create_app()
