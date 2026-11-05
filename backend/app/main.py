from fastapi import FastAPI

from app.modules.overview.routes import router as overview_router
from app.modules.social.repository import initialize_database
from app.modules.social.routes import router as social_router

app = FastAPI(title="Orbita", version="0.1.0")
app.include_router(overview_router, prefix="/api")
app.include_router(social_router, prefix="/api")


@app.on_event("startup")
def initialize_social_storage() -> None:
    initialize_database()
