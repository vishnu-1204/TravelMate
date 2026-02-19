# TravelMate Auth + Package Backend

Express + TypeScript backend that handles:

- Auth APIs (JWT + SQLite)
- Booking email API
- Live travel package APIs powered by Amadeus
- Supabase caching for package data

## Setup

1. Install dependencies:
```bash
cd auth-backend
npm install
```

2. Copy env template:
```bash
cp .env.example .env
```

3. Fill required vars in `.env`:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AMADEUS_CLIENT_ID`
- `AMADEUS_CLIENT_SECRET`
- `JWT_SECRET`

4. Start server:
```bash
npm run dev
```

## Package API

### `GET /api/packages`

Fetch package list from Supabase cache (refreshes from Amadeus when stale).

Query params:

- `q` search in title/destination
- `destination`
- `category` (`international|domestic|honeymoon|group|educational|adventure`)
- `minPrice`, `maxPrice`
- `minDuration`, `maxDuration`
- `minRating`
- `sortBy` (`trending|price|rating|duration`)
- `sortOrder` (`asc|desc`)
- `limit`, `offset`

### `GET /api/packages/:id`

Fetch a single package by ID.

### `GET /api/packages/refresh`

Force refresh cache from Amadeus.

## Caching Strategy

- Cached in Supabase table: `public.travel_packages_cache`
- Upserted using `package_id` unique key
- TTL via `expires_at`
- Background refresh with interval from `PACKAGE_REFRESH_INTERVAL_MINUTES`
- Expired row pruning

## Rate Limiting

All `/api/packages/*` endpoints are rate-limited using:

- `PACKAGE_RATE_LIMIT_WINDOW_MS`
- `PACKAGE_RATE_LIMIT_MAX_REQUESTS`

