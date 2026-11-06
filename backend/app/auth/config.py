import os

DEFAULT_ALLOWED_EMAILS = "giovannicarre49@gmail.com"
SESSION_COOKIE = "orbita_session"
STATE_COOKIE = "orbita_google_state"
CALLBACK_PATH = "/api/auth/google/callback"


def api_public_url() -> str:
    return os.getenv("ORBITA_API_PUBLIC_URL", "http://localhost:8000").rstrip("/")


def frontend_public_url() -> str:
    return os.getenv("ORBITA_FRONTEND_PUBLIC_URL", "http://localhost:5173").rstrip("/")


def allowed_emails() -> set[str]:
    setting = os.getenv("ORBITA_ALLOWED_EMAILS", DEFAULT_ALLOWED_EMAILS)
    return {email.strip().lower() for email in setting.split(",") if email.strip()}


def session_secret() -> str:
    return os.getenv("ORBITA_SESSION_SECRET", "")


def google_client() -> tuple[str, str]:
    return os.getenv("GOOGLE_CLIENT_ID", ""), os.getenv("GOOGLE_CLIENT_SECRET", "")


def google_ready() -> bool:
    client_id, client_secret = google_client()
    return bool(client_id and client_secret and len(session_secret()) >= 32)


def secure_cookies() -> bool:
    return api_public_url().startswith("https://")
