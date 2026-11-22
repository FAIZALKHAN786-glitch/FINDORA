# Findora AI Match — Design

Date: 2026-11-22
Status: proposed

## Intent

Findora currently helps people browse a local lost-and-found noticeboard. The new feature gives **people who lost something** a faster path: they describe the item in plain language and get a short list of likely listings, with an explanation of why each one matched.

The selling point is honest: Findora will use a **small local embedding model** to understand the meaning of a description. It is not a fake “AI” badge, and it is not a full generative RAG chatbot.

## Goals

- Let a visitor type a natural description such as “black backpack left in the library on Tuesday” instead of manually using filters.
- Return the top few **possible matches** from local listings, ordered by semantic similarity.
- Show plain-language reasons for each match (category, location, date words, overlapping description terms).
- Keep all data and model execution local. No API key, no paid service, no public deployment.
- Preserve the existing browse/search/filter flow unchanged.
- Keep the feature testable without downloading a model by allowing an embedder to be injected into `createApp`.

## Non-goals

- No chatbot conversation, no generated prose answers, no LLM service.
- No “we found your item” claim; results are suggestions requiring human confirmation.
- No automatic contact, claim, or status change from the AI panel.
- No admin panel, email, WebSockets, or realtime updates.
- No pgvector or new database service.

## Anti-goals

- Calling TF-IDF or keyword search “AI.”
- Sending item text, user queries, or credentials to any external endpoint at runtime.
- Replacing the current filters or hiding the full listing list.
- Adding a heavyweight model that makes first setup slow or confusing.

## Constraints

- Existing stack: React + Vite on `:3000`, Express on `:3001`, Postgres 16 in Docker, httpOnly cookie sessions.
- localhost-only, $0 MVP.
- One new npm dependency is acceptable if it runs locally in Node and has a permissive license.
- Model files are downloaded once on first use, then cached locally; setup docs must say this.
- All SQL stays parameterized.
- Existing auth, ownership, validation, and security hardening must remain intact.

## Approaches

### A. Local embedding search — chosen

Use a small local sentence-embedding model (for example a quantized MiniLM-class model through Transformers.js) to turn each item's title, description, category, location, and date into a vector. Embed the user's query the same way, compute cosine similarity in Node, and return the top matches above a conservative threshold.

- **Trade-off:** real semantic AI and fully local, but adds one dependency plus a one-time model download and a little CPU work.
- **Why picked:** it gives Findora a genuine AI purpose with the smallest surface area that still deserves the label.

### B. Full local RAG chatbot

Same retrieval as A, plus a small local generative model that writes a 2–3 sentence answer citing matching listings.

- **Trade-off:** strongest “AI” story, but much heavier setup, slower responses, more failure modes, and more places where the model can sound certain when it is not.
- **Why not picked:** overkill for the actual job and risks turning a lost-and-found MVP into a chatbot product.

### C. Rule-based smart search

Use TF-IDF/BM25, synonyms, and field boosts over item text with no model.

- **Trade-off:** fastest and lightest, but it should be called “smart search,” not AI. It also handles phrasing like “my lecture notes went missing” worse than embeddings.
- **Why not picked:** the user explicitly wants an honest AI novelty with a real purpose.

## Chosen design

### Data model

Add a new table:

```sql
create table if not exists item_embeddings (
  item_id uuid primary key references items(id) on delete cascade,
  model text not null,
  embedding jsonb not null,
  updated_at timestamptz not null default now()
);
```

Store the vector as `jsonb` and compute cosine similarity in Node. This avoids changing the Docker image to include pgvector. The table is naturally small for a campus MVP; a future migration to pgvector does not change the API shape.

If `items.id` is currently text rather than uuid, use the existing column type instead and note that correction in the plan.

Vectors from different models are never mixed. `/api/ai/match` only reads embeddings whose `model` equals the active model constant. The backfill re-embeds rows that have no embedding **or** whose `model` differs from the active model.

### Embedding helper

Create `server/embedder.js`:

- `createEmbedder()` loads the local model lazily on first use.
- `embed(text)` returns a normalized numeric vector.
- Model name is a constant and is stored with each embedding.
- The helper logs one clear startup/first-use message: “Loading local AI model (first run downloads model files).”
- Model cache directory is configurable through an environment variable with a local default.
- No network calls at runtime after the model is cached.

`createApp` accepts an optional `embedder` so tests can inject a deterministic fake:

```js
createApp({ store, uploadsDir, embedder })
```

If no embedder is injected, the production helper is used.

### Indexing

- On `POST /api/items`, after validation, build one text blob from title, description, category, location, and date, compute its embedding, and insert the item plus embedding in **one Postgres transaction** through a single store method.
- If embedding or embedding insert fails, roll back and fail the request with a clear 500; do not silently create an unsearchable listing.
- On `DELETE /api/items/:id`, the foreign key removes the embedding.
- Add `scripts/ai-backfill.mjs` and `npm run ai:index` to compute embeddings for rows that are missing one or were made with a different model.
- `SETUP.md` documents `npm run ai:index` after `npm run db:init` and after restoring seed data.

### API

Add `POST /api/ai/match`:

```json
{ "query": "black backpack left in the library on Tuesday" }
```

Response:

```json
{
  "matches": [
    {
      "item": { "...normal item fields..." },
      "score": 0.71,
      "reasons": ["similar category: Bags", "mentions library", "description overlap"]
    }
  ]
}
```

Rules:

- Query must be a 3–300 character string; otherwise 400.
- No authentication required; item reads are already public.
- Apply the same rate-limit pattern as auth endpoints, with its own counter: **30 requests / 15 minutes per IP**.
- Search only items with status `lost` or `found` that have an embedding from the active model.
- Return at most 5 matches.
- Apply a conservative minimum score threshold; if nothing clears it, return an empty `matches` array.
- Never return raw embeddings, model internals, or file paths.
- Reasons are derived from deterministic field checks, not generated by a model. A date reason fires when the query contains the item’s ISO date, its weekday name/abbreviation, or its month/day text; no relative terms such as “today” or “yesterday” are interpreted.

### Frontend

Add an “Ask Findora” panel above the existing search results on Home:

```text
Lost something? Describe it.
[ black backpack, library, Tuesday        ] [ Find matches ]

Possible matches — AI suggestions, please confirm before contacting.
• Blue notebook — Books — Library — 78% similar
  Why: similar category, mentions library, description overlap
```

Behavior:

- Uses the existing `api` client.
- Existing search/filter controls stay below and keep working.
- A “Browse all” link clears the AI results.
- Loading, empty, and error states use existing primitives.
- Results use the existing `ItemCard` where practical.
- Copy always says “possible matches” and “AI suggestions,” never “found.”
- Reduced-motion and accessibility patterns already in the app are preserved.

### Files touched

- `server/embedder.js` (new)
- `server/match.js` (new)
- `scripts/ai-backfill.mjs` (new)
- `server/app.js`
- `server/store.js`
- `db/schema.sql`
- `src/lib/api.js`
- `src/pages/Home.jsx`
- `package.json` / `package-lock.json`
- `SETUP.md`
- `.gitignore` for local model cache
- `test/ai-match.test.mjs` (new)
- `test/api.test.mjs`
- `test/db-files.test.mjs`
- `test/frontend-contract.test.mjs`

### Tests

- Inject a fake embedder and assert that known vectors rank in the expected order.
- Assert query validation, empty result threshold, max 5 results, no embedding leakage, and that stale-model vectors are ignored.
- Assert that an embedding failure rolls back the item insert.
- Assert rate limiting on `/api/ai/match` at 30 requests / 15 minutes.
- Assert delete removes the embedding via cascade or store call.
- Frontend contract test asserts the “Ask Findora” panel and “AI suggestions” copy exist.
- Run `npm test` and `npm run build`.
- Browser check: type a description, see candidate cards, confirm filters still work, check mobile width and console errors.

## What is left to the builder

- Choose the exact small embedding package and model after checking current docs; prefer a quantized MiniLM-class model with a permissive license and stable Node support.
- Decide the exact similarity threshold after a few local sanity queries; start conservative.
- Decide whether the model cache lives under `node_modules/.cache`, `.cache/findora-models`, or an OS-local path, then gitignore it.
- Keep the API response shape in this document unless a concrete local test proves a field is unhelpful.
