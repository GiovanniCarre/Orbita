import os
from dataclasses import dataclass

GRAPH_VERSION = os.getenv("META_GRAPH_API_VERSION", "v26.0")
API_PUBLIC_URL = os.getenv("ORBITA_API_PUBLIC_URL", "http://localhost:8000").rstrip("/")
FRONTEND_PUBLIC_URL = os.getenv("ORBITA_FRONTEND_PUBLIC_URL", "http://localhost:5173").rstrip("/")
DATABASE_CONFIG = {
    "host": os.getenv("DATABASE_HOST", ""),
    "port": os.getenv("DATABASE_PORT", "5432"),
    "dbname": os.getenv("DATABASE_NAME", ""),
    "user": os.getenv("DATABASE_USER", ""),
    "password": os.getenv("DATABASE_PASSWORD", ""),
}
TOKEN_ENCRYPTION_KEY = os.getenv("META_TOKEN_ENCRYPTION_KEY", "")


@dataclass(frozen=True)
class ProviderConfig:
    app_id: str
    app_secret: str


def provider_config(provider: str) -> ProviderConfig:
    prefix = "META_INSTAGRAM" if provider == "instagram" else "META_FACEBOOK"
    return ProviderConfig(
        app_id=os.getenv(f"{prefix}_APP_ID", ""),
        app_secret=os.getenv(f"{prefix}_APP_SECRET", ""),
    )


def provider_ready(provider: str) -> bool:
    config = provider_config(provider)
    return bool(
        config.app_id
        and config.app_secret
        and database_configured()
        and len(TOKEN_ENCRYPTION_KEY) >= 32
    )


def database_configured() -> bool:
    return all(DATABASE_CONFIG.values())


def callback_uri(provider: str) -> str:
    return f"{API_PUBLIC_URL}/api/social/meta/{provider}/callback"
