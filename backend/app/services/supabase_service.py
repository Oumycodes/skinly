import os
from collections.abc import Callable
from typing import TypeVar

import httpx
from supabase import Client, create_client

_client: Client | None = None

T = TypeVar("T")


def reset_supabase() -> None:
    global _client
    _client = None


def get_supabase() -> Client | None:
    global _client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        return None

    if _client is None:
        _client = create_client(url, key)

    return _client


def supabase_call(fn: Callable[[Client], T], default: T, *, retries: int = 2) -> T:
    """Run a Supabase query with retry + safe fallback when the DB is waking up."""
    for attempt in range(retries):
        client = get_supabase()
        if not client:
            return default

        try:
            return fn(client)
        except (httpx.HTTPError, OSError):
            reset_supabase()
            if attempt + 1 >= retries:
                return default

    return default
