from collections.abc import AsyncIterator, Iterable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

from app.auth.routes import router as auth_router
from app.auth.session import current_email
from app.registry import configured_modules, load_modules

PUBLIC_PATHS = {"/api/health"}
PUBLIC_PREFIXES = ("/api/auth/",)


def create_app(module_names: Iterable[str] | None = None) -> FastAPI:
    modules = load_modules(configured_modules() if module_names is None else module_names)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        for module in modules:
            for hook in module.startup:
                hook()
        yield

    application = FastAPI(title="Orbita", version="0.1.0", lifespan=lifespan)

    @application.middleware("http")
    async def require_session(request: Request, call_next) -> Response:
        path = request.url.path
        public = path in PUBLIC_PATHS or path.startswith(PUBLIC_PREFIXES)
        if not public and current_email(request) is None:
            return JSONResponse({"detail": "Authentification requise"}, status_code=401)
        return await call_next(request)

    application.include_router(auth_router, prefix="/api")

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
