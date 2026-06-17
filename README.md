# Skinly

AI-powered skincare app for iOS and Android. React Native + Expo frontend, FastAPI backend, Supabase for auth/storage/database.

## Features

| Feature | Status |
|---------|--------|
| Skin scan (camera → GPT-4o Vision) | ✅ |
| Supabase auth + freemium scan limits | ✅ |
| Scan persistence (storage + DB) | ✅ |
| Product shelf (barcode, photo, search) | ✅ |
| Ingredient conflict checker | ✅ |
| Routine builder | 🔲 Stub |
| Progress tracker | 🔲 Stub |

## Project structure

```
skinly/
├── mobile/          # React Native + Expo
├── backend/         # FastAPI (Python 3.11)
└── supabase/        # Migrations + setup docs
```

## Setup

### 1. Supabase

Create a project at [supabase.com](https://supabase.com), then follow [supabase/README.md](supabase/README.md).

### 2. Environment

```bash
cp .env.example .env
```

Fill in:
- `OPENAI_API_KEY` — GPT-4o Vision for scans and product photo ID
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
- `FREE_SCAN_LIMIT` — default 3 scans/month on free plan

### 3. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Mobile

```bash
cd mobile
cp .env.example .env   # set EXPO_PUBLIC_* vars
npm install
npm start
```

On a physical device, set `EXPO_PUBLIC_API_URL` to your machine's LAN IP.

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/scan` | ✅ | Analyze selfie, persist result |
| GET | `/scan/quota` | ✅ | Free scan usage this month |
| GET | `/products/search?q=` | — | Open Beauty Facts search |
| GET | `/products/barcode/{code}` | — | Barcode lookup |
| POST | `/products/identify` | — | Photo → product name (GPT-4o) |
| GET | `/products/shelf` | ✅ | User's product shelf |
| POST | `/products/shelf` | ✅ | Add product |
| DELETE | `/products/shelf/{id}` | ✅ | Remove product |
| GET | `/products/conflicts` | ✅ | Ingredient conflict check |

## Freemium

Free plan: **3 scans per calendar month** (configurable via `FREE_SCAN_LIMIT`). Pro plan (`profiles.plan = 'pro'`) gets unlimited scans.

## Color system

- Primary: `#1D9E75`
- Background: `#FAFAF8`
- Surface: `#FFFFFF`
- Text: `#1A1A18`

Full tokens in `mobile/src/constants/colors.ts`.
