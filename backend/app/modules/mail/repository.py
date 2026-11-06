"""Store one-time OAuth states and encrypted Gmail credentials."""

import hashlib

import psycopg

from app.modules.mail.config import database_config, ready, setting


def connect() -> psycopg.Connection:
    return psycopg.connect(**database_config())


def initialize_database() -> None:
    if not ready():
        return
    with connect() as connection:
        connection.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
        connection.execute("""CREATE TABLE IF NOT EXISTS mail_oauth_states (
            state_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL)""")
        connection.execute("""CREATE TABLE IF NOT EXISTS mail_accounts (
            email TEXT PRIMARY KEY, refresh_token BYTEA NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now())""")
        connection.execute("""CREATE TABLE IF NOT EXISTS mail_send_attempts (
            id UUID PRIMARY KEY, account TEXT NOT NULL, project TEXT NOT NULL,
            payload_hash TEXT NOT NULL, state TEXT NOT NULL, provider_id TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now())""")


def create_state(state: str, email: str) -> None:
    with connect() as connection:
        connection.execute("DELETE FROM mail_oauth_states WHERE expires_at < now()")
        connection.execute(
            "INSERT INTO mail_oauth_states VALUES (%s, %s, now() + interval '10 minutes')",
            (hashlib.sha256(state.encode()).hexdigest(), email),
        )


def consume_state(state: str) -> str | None:
    with connect() as connection:
        row = connection.execute(
            "DELETE FROM mail_oauth_states WHERE state_hash = %s "
            "AND expires_at > now() RETURNING email",
            (hashlib.sha256(state.encode()).hexdigest(),),
        ).fetchone()
        return row[0] if row else None


def save_account(email: str, refresh_token: str) -> None:
    with connect() as connection:
        connection.execute(
            """INSERT INTO mail_accounts (email, refresh_token)
            VALUES (%s, pgp_sym_encrypt(%s, %s)) ON CONFLICT (email) DO UPDATE SET
            refresh_token = EXCLUDED.refresh_token, updated_at = now()""",
            (email, refresh_token, setting("GMAIL_TOKEN_ENCRYPTION_KEY")),
        )


def account_token(email: str) -> str | None:
    with connect() as connection:
        row = connection.execute(
            "SELECT pgp_sym_decrypt(refresh_token, %s) FROM mail_accounts WHERE email = %s",
            (setting("GMAIL_TOKEN_ENCRYPTION_KEY"), email),
        ).fetchone()
    return row[0] if row else None


def delete_account(email: str) -> None:
    with connect() as connection:
        connection.execute("DELETE FROM mail_accounts WHERE email = %s", (email,))


def list_accounts() -> list[str]:
    with connect() as connection:
        return [
            row[0] for row in connection.execute("SELECT email FROM mail_accounts ORDER BY email")
        ]


def claim_send(attempt_id: str, account: str, project: str, payload_hash: str) -> bool:
    with connect() as connection:
        return (
            connection.execute(
                """INSERT INTO mail_send_attempts (id, account, project, payload_hash, state)
            VALUES (%s, %s, %s, %s, 'pending') ON CONFLICT DO NOTHING RETURNING id""",
                (attempt_id, account, project, payload_hash),
            ).fetchone()
            is not None
        )


def finish_send(attempt_id: str, state: str, provider_id: str | None = None) -> None:
    with connect() as connection:
        connection.execute(
            "UPDATE mail_send_attempts SET state = %s, provider_id = %s WHERE id = %s",
            (state, provider_id, attempt_id),
        )
