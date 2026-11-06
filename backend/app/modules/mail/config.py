"""Configuration for the read-only Gmail integration."""

import os


def setting(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def database_config() -> dict[str, str]:
    return {
        "host": setting("DATABASE_HOST"),
        "port": setting("DATABASE_PORT", "5432"),
        "dbname": setting("DATABASE_NAME"),
        "user": setting("DATABASE_USER"),
        "password": setting("DATABASE_PASSWORD"),
    }


def ready() -> bool:
    return bool(
        setting("GMAIL_CLIENT_ID")
        and setting("GMAIL_CLIENT_SECRET")
        and len(setting("GMAIL_TOKEN_ENCRYPTION_KEY")) >= 32
        and all(database_config().values())
    )


def callback_url() -> str:
    return f"{setting('ORBITA_API_PUBLIC_URL', 'http://localhost:8000').rstrip('/')}/api/mail/google/callback"


def frontend_url() -> str:
    return setting("ORBITA_FRONTEND_PUBLIC_URL", "http://localhost:5173").rstrip("/")
