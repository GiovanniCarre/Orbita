from datetime import datetime, timedelta, timezone
from uuid import UUID

import psycopg

from app.modules.social.config import (
    DATABASE_CONFIG,
    TOKEN_ENCRYPTION_KEY,
    database_configured,
)


def connect() -> psycopg.Connection:
    if not database_configured():
        raise RuntimeError("Social storage is not configured")
    return psycopg.connect(**DATABASE_CONFIG)


def initialize_database() -> None:
    if not database_configured():
        return
    with connect() as connection:
        connection.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS social_oauth_states (
                state_hash TEXT PRIMARY KEY,
                provider TEXT NOT NULL CHECK (provider IN ('instagram', 'facebook')),
                expires_at TIMESTAMPTZ NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS social_accounts (
                id UUID PRIMARY KEY,
                platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook')),
                provider_account_id TEXT NOT NULL,
                display_name TEXT NOT NULL,
                access_token BYTEA NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE (platform, provider_account_id)
            )
            """
        )


def create_oauth_state(state_hash: str, provider: str) -> None:
    expiry = datetime.now(timezone.utc) + timedelta(minutes=10)
    with connect() as connection:
        connection.execute("DELETE FROM social_oauth_states WHERE expires_at < now()")
        connection.execute(
            """INSERT INTO social_oauth_states
               (state_hash, provider, expires_at) VALUES (%s, %s, %s)""",
            (state_hash, provider, expiry),
        )


def consume_oauth_state(state_hash: str, provider: str) -> bool:
    with connect() as connection:
        row = connection.execute(
            """DELETE FROM social_oauth_states
               WHERE state_hash = %s AND provider = %s AND expires_at > now()
               RETURNING state_hash""",
            (state_hash, provider),
        ).fetchone()
    return row is not None


def save_account(platform: str, provider_id: str, display_name: str, access_token: str) -> None:
    with connect() as connection:
        connection.execute(
            """INSERT INTO social_accounts
               (id, platform, provider_account_id, display_name, access_token)
               VALUES (gen_random_uuid(), %s, %s, %s, pgp_sym_encrypt(%s, %s))
               ON CONFLICT (platform, provider_account_id) DO UPDATE SET
                 display_name = EXCLUDED.display_name,
                 access_token = EXCLUDED.access_token,
                 updated_at = now()""",
            (platform, provider_id, display_name, access_token, TOKEN_ENCRYPTION_KEY),
        )


def list_accounts() -> list[dict[str, str]]:
    with connect() as connection:
        rows = connection.execute(
            """SELECT id, platform, provider_account_id, display_name
               FROM social_accounts ORDER BY platform, display_name"""
        ).fetchall()
    return [
        {
            "id": str(row[0]),
            "platform": row[1],
            "provider_account_id": row[2],
            "display_name": row[3],
        }
        for row in rows
    ]


def delete_account(account_id: str) -> bool:
    with connect() as connection:
        row = connection.execute(
            "DELETE FROM social_accounts WHERE id = %s RETURNING id",
            (UUID(account_id),),
        ).fetchone()
    return row is not None
