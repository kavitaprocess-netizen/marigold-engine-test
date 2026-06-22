# Marigold — Deterministic CIE Engine Test

A minimal Express API that proves the deterministic Cultural Intelligence Engine works end-to-end against real Supabase data. This is a **separate project from the demo** (`marigold-deploy`) — the demo is untouched and continues running independently.

---

## What this is

The Marigold demo uses AI-prompted plan generation. This engine is the production replacement: it reads only from advisor-approved taxonomy data in Supabase and produces deterministic output — no AI calls in the cultural content path.

This test server exposes three routes to verify the engine works against live data before it's integrated into the full product.

---

## Routes

### `GET /api/health`
Confirms the server is running and env variables are configured.

```json
{ "status": "ok", "engine": "deterministic", "supabase_url": "configured", "secret_key": "configured" }
```

### `GET /api/traditions`
Lists all traditions currently approved and live in the database.

```json
{ "count": 10, "traditions": [{ "slug": "sikh", "name": "Sikh", ... }] }
```

### `POST /api/generate-plan`
Generates a deterministic plan for one or two traditions.

**Single tradition:**
```json
{ "slugs": ["sikh"], "budget": 80000 }
```

**Interfaith merge (runs the full merge algorithm):**
```json
{ "slugs": ["gujarati", "jewish-reform-conservative"], "budget": 120000, "jurisdiction": "New Jersey, USA" }
```

Returns checklist item count, ceremony events, vendor categories, conflict flags, and budget breakdown — all from live Supabase data, no AI involved.

---

## Environment variables

Set these in Vercel before deploying:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (`https://xxxxx.supabase.co`) |
| `SUPABASE_SECRET_KEY` | Secret/service key — server-side only, never exposed to the browser |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key — safe for client-side use |

---

## How to deploy

1. Push this folder to a new GitHub repo
2. Import into Vercel as a new project (separate from the demo)
3. Add the three environment variables above
4. Deploy

---

## File structure

```
marigold-engine-test/
  server.js                  ← Express API (3 routes)
  package.json
  vercel.json
  engine/
    index.js                 ← Main entry point (generatePlan)
    budgetCalculator.js      ← Budget calculation logic (spec §6)
    interfaithMerge.js       ← Interfaith merge algorithm (spec §7)
    taxonomyData.js          ← Supabase data access (reads live_taxonomy only)
    universalChecklist.json  ← 39-item universal checklist (all traditions inherit this)
```

---

## Key design constraint

The engine **never falls back to AI content** if a tradition has no approved version. It returns a clear `NO_APPROVED_VERSION` error instead. This is intentional — the entire point of this engine is that cultural content comes only from human-reviewed, advisor-approved taxonomy data, not probabilistic AI generation.
