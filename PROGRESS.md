# STREAMIX — Progress

## Current phase

Phase 1 — Dynamic content engine: real provider port, API routes, optional TMDB enrichment, minimal frontend consumption.

## Phase 1 checklist

- [x] Inspected project structure, docs, Git state (preserved)
- [x] Fetched and parsed the CSX manifest `CS.json` and `plugins.json`; enumerated 5 real providers (Bollyflix, CineStream, MoviesDrive, Moviesmod, VegaMovies)
- [x] Inspected the actual CineStream Kotlin extension source in the CSX repo (`CineStream/src/main/kotlin/com/megix/`); selected CineStream (English, v487, most mature; SIMKL provider needs a compiled-in client ID that is not available)
- [x] Verified the extension's real endpoints live before porting (top catalogs, genre, pagination, search, detail, Kitsu anime search)
- [x] Built provider abstraction: `BaseProvider` (fetch/timeout/error mapping), `ProviderError` codes, provider registry
- [x] Implemented ONE real provider: `CineStreamProvider` port of `CineStreamProvider.kt` main API (cinemeta top catalogs + v3-cinemeta search + Kitsu anime search + detail), with normalized title schema
- [x] Backend routes: `GET /api/home/trending`, `GET /api/home/latest`, `GET /api/home/popular-series`, `GET /api/search?q=...` with validation, TTL cache, stale-cache fallback, provider error mapping
- [x] TMDB enrichment implemented server-side (conservative title+year+type match, cached) — disabled by default because no `TMDB_API_KEY` is present; unit-tested disabled path
- [x] Minimal frontend integration: rows from the 3 home endpoints + search box, loading/error/empty states, poster artwork
- [x] Verified: server tests (12/12 pass), client build, health check, live endpoint data, validation errors, caching, end-to-end Vite proxy

## Files created/modified in Phase 1

- `packages/server/src/config.js` (new) — loads repo-root `.env`, exports config
- `packages/server/src/cache.js` (new) — in-memory TTL cache
- `packages/server/src/providers/base.js` (new) — `BaseProvider`, `ProviderError`
- `packages/server/src/providers/cinemeta.js` (new) — CineStream provider port + `normalizeMeta`
- `packages/server/src/providers/index.js` (new) — provider registry/factory
- `packages/server/src/providers/tmdb.js` (new) — optional TMDB enricher
- `packages/server/src/routes/home.js` (new) — 3 home routes
- `packages/server/src/routes/search.js` (new) — search route with validation
- `packages/server/src/index.js` (modified) — mounts routes, wires cache/provider/enricher
- `packages/server/src/cache.test.js`, `packages/server/src/providers/cinemeta.test.js`, `packages/server/src/providers/tmdb.test.js` (new)
- `packages/server/package.json` (modified) — version 0.1.0, `test` script
- `package.json` (modified) — root `test` script
- `packages/client/src/api.js` (new), `packages/client/src/components/Row.jsx`, `TitleCard.jsx`, `SearchBox.jsx` (new)
- `packages/client/src/App.jsx`, `packages/client/src/index.css` (modified) — content view

## Commands executed and results

- `npm run test` → 12 tests, 12 pass, 0 fail (cache, cinemeta normalization, tmdb enricher disabled path)
- `npm run build` → Vite 8.3.4, `✓ built in 109ms` (20 modules)
- server start → `[streamix] provider=CineStream tmdb_enrichment=disabled`
- `GET /api/health` → `ok=true version=0.1.0`
- `GET /api/home/trending` → 24 real movies, e.g. `Unabomber (2026)`, `Backrooms (2026)`; `enrichment.status=disabled`
- `GET /api/home/latest` → 24 movies sorted newest-first (ranking field documents the method)
- `GET /api/home/popular-series` → 24 real series, e.g. `East of Eden (2026)`, `Lanterns (2026)`, `MobLand (2025)`
- `GET /api/search?q=batman` → 40 real results (`Batman (1989)`, `The Batman (2022)`, ...)
- `GET /api/search?q=a` → HTTP 400 `validation_error` ("at least 2 characters"); missing `q` → HTTP 400
- Second identical search → `cached=true`
- Vite proxy end-to-end: page 200/title STREAMIX, `/api/home/trending` and `/api/search?q=inception` (32 results, first `Inception`) served through the proxy

All Phase 1 verification passed; no errors to fix.

## Provider documentation (port fidelity)

- Source inspected: `CineStream/src/main/kotlin/com/megix/CineStreamProvider.kt` in the CSX repo (plus `ApiConstants.kt`, `CineStream.kt`, `CineSimklProvider.kt`, `CineTmdbProvider.kt`)
- Ported exactly: top catalog URL pattern `https://cinemeta-catalogs.strem.io/top/catalog/{type}/top/skip={n}[&genre=G].json`, search `https://v3-cinemeta.strem.io/catalog/{type}/top/search={q}.json` (+ `anime-kitsu.strem.fun` anime search), detail `https://v3-cinemeta.strem.io/meta/{type}/{id}.json`, image proxy `https://wsrv.nl/?url=` for metahub.space/kitsu URLs, title = first alias ?? name, type = movie/series
- The extension also registers `CineSimklProvider` (needs a SIMKL client ID compiled into the .cs3 — unavailable, documented as a blocker, not implemented) and `CineTmdbProvider` (TMDB with a key; superseded by our optional server-side TMDB enrichment)

## Known issues / limitations

- `latest` row: the provider exposes no dedicated "latest" catalog. `/api/home/latest` returns the top movie catalog sorted by release year descending; the `ranking` field documents this.
- TMDB enrichment is disabled until the user supplies a real `TMDB_API_KEY` in `.env`; the code path is implemented and the no-key behavior is unit-tested. No TMDB calls were made without a key.
- Search results rely on the provider's sparse catalog metas; rating/genres are absent on some results and stay `null` (not invented).
- Kitsu anime search is included in `/api/search` as the extension does; anime results carry `kitsu:` ids and may be mixed into results.
- Playback and stream resolution are intentionally NOT implemented (Phase 3); `getDetails` exists in the provider layer but no route or UI uses it yet (Phase 2).
- CineStream providers Bollyflix/MoviesDrive/Moviesmod/VegaMovies were not ported (Phase 4 provider work).

## Next task (Phase 2, step 1)

Design the same-page detail experience: wire `GET /api/detail/:type/:id` (using the already-implemented `provider.getDetails`) and build the responsive Netflix-style homepage (hero + rows) with a detail modal showing seasons/episodes from real Phase 1 data. Do not start playback.
