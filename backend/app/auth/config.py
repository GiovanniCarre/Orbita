import os

DEFAULT_LOGIN_EMAIL = "giovannicarre49@gmail.com"
SESSION_COOKIE = "orbita_session"


def login_email() -> str:
    return os.getenv("ORBITA_LOGIN_EMAIL", DEFAULT_LOGIN_EMAIL).strip().lower()


def password_hash() -> str:
    return os.getenv("ORBITA_PASSWORD_HASH", "").strip()


def session_secret() -> str:
    return os.getenv("ORBITA_SESSION_SECRET", "")


def login_ready() -> bool:
    return bool(login_email() and password_hash() and len(session_secret()) >= 32)


def secure_cookies() -> bool:
    url = os.getenv("ORBITA_API_PUBLIC_URL", "http://localhost:8000")
    return url.startswith("https://")
