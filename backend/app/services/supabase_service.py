import os

from supabase import Client, create_client

_client: Client | None = None


def get_supabase() -> Client | None:
    global _client

    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not key:
        return None

    if _client is None:
        _client = create_client(url, key)

    return _client
