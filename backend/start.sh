#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -x "$ROOT/.venv/bin/python" ]]; then
  echo "Missing virtualenv. Run:"
  echo "  python3.11 -m venv .venv"
  echo "  .venv/bin/pip install -r requirements.txt"
  exit 1
fi

exec "$ROOT/.venv/bin/python" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
