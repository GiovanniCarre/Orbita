"""scrypt password hashes stored as ``scrypt:N:r:p:salt:hash`` (base64url, no ``$`` for .env).

Generate a hash with ``python -m app.auth.password`` from the backend directory.
"""

import base64
import getpass
import hashlib
import hmac
import secrets

N, R, P = 2**15, 8, 1
MAX_MEMORY = 64 * 1024 * 1024


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = secrets.token_bytes(16) if salt is None else salt
    digest = _scrypt(password, salt, N, R, P)
    return f"scrypt:{N}:{R}:{P}:{_encode(salt)}:{_encode(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, n, r, p, salt, expected = stored.split(":")
        if scheme != "scrypt":
            return False
        digest = _scrypt(password, _decode(salt), int(n), int(r), int(p))
        return hmac.compare_digest(digest, _decode(expected))
    except (ValueError, TypeError):
        return False


def _scrypt(password: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(password.encode(), salt=salt, n=n, r=r, p=p, maxmem=MAX_MEMORY)


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip("=")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


if __name__ == "__main__":
    first = getpass.getpass("Nouveau mot de passe Orbita : ")
    if len(first) < 12:
        raise SystemExit("Choisir au moins 12 caractères.")
    if getpass.getpass("Confirmer : ") != first:
        raise SystemExit("Les mots de passe ne correspondent pas.")
    print(f"ORBITA_PASSWORD_HASH={hash_password(first)}")
