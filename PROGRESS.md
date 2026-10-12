# STREAMIX — Progress

## Current phase

Post-Phase-5 restoration: CSX catalog/search/poster repair and playback honesty (requested repair work).

## Confirmed defects reproduced before repair

1. **Search API was 404.** The search router defines `GET /search` but was mounted at `/api/search`, so the real path was `/api/search/search`; `GET /api/search?q=...` returned `Cannot GET /api/search`.
2. **Search results never rendered in the UI.** App only rendered results when `view === "search"`, but no code path ever set that view (nav links are Home/Movies/Series).
3. **Catalog responses blocked on TMDB.** `home.js` and `search.js` did `await enricher.enrich(items)` before responding; the enricher made a serial, timeout-less TMDB HTTP call per item (146 calls for trending), making TMDB effectively required for the catalog to appear.
4. **Metahub posters were routed through the wsrv.nl proxy unnecessarily.** Direct `images.metahub.space` posters return 200 with a browser UA; the extra proxy hop added an external dependency for every card.
5. **Search input was disabled while results loaded**, blocking continued typing.
6. Playback explicitly fell back to a local fixture (correct behavior); it was labeled, but the real-provider blocker was not precisely pinned to the extractor layer.

## Fixes implemented

- `index.js`: search router mounted at `/api` → `/api/search` works again.
- `App.jsx`: `handleSearch` sets `view = "search"`; `clearSearch` returns to home; `latestQueryRef` guard ensures older responses cannot overwrite newer results (belt-and-braces with the existing abort).
- `SearchBox.jsx`: input stays enabled while requests are in flight; debounce + abort/cancel preserved.
- `tmdb.js`: bounded concurrency (`mapWithConcurrency`, 4 workers), 4 s per-search timeout, items preserved in order.
- `home.js` / `search.js`: provider data is returned **immediately**; when TMDB is configured, enrichment runs in the background and warms the cache (first response `enrichment.status: "pending"`, next fetch `"enabled"` with matched count). TMDB is never required for cards to render.
- `cinemeta.js`: metahub poster URLs are served directly (only Kitsu images stay proxied via wsrv).
- Tests: `mapWithConcurrency` order/limit/empty/rejection coverage.

## Verification (actual results)

- `npm run test` → 34/34 pass
- `npm run build` → OK (main 238 kB, lazy hls chunk 575 kB)
- `GET /api/home/trending` → 0.13 s cold, `enrichment.status=pending`, 24 items; poster now direct `https://images.metahub.space/poster/small/tt6933238/img`; next fetch `cached=true enrichment=enabled matched=146`
- `GET /api/search?q=batman` → 37 results, first `Batman` (1989); `inception` → 30 (`Inception`); `avengers` → 33 (`Avengers: Endgame`); `dune` → 23 (`Dune`); `interstellar` via Vite proxy → 31 (`Interstellar`)
- Cold search latency bound: 0.4-5.4 s (upstream warm-up); cached searches are instant (0.00-0.13 s); direct upstream endpoint probes measured 71-470 ms each
- Proxy page 200/STREAMIX; stream session: `provider=CineStream/local_fixture`, `resolution.status=fixture_fallback`, note "Provider stream resolution is not implemented yet; playing the local test fixture"; playlist 200 `application/vnd.apple.mpegurl`; cleanup OK
- Missing-poster path (TitleCard placeholder behind image) unchanged and verified by code review

## Provider documentation (inspection notes)

- Inspected the real CSX sources: `CineStream/src/main/kotlin/com/megix/{CineStreamProvider,CineStreamExtractors,ApiConstants,CineSimklProvider,CineTmdbProvider}.kt` on the CSX `master` branch, plus the `builds/CS.json` manifest and provider metadata.
- Catalog/search/detail flow used by STREAMIX is the CineStream main API port (cinemeta top catalogs, v3-cinemeta search, kitsu anime search, meta detail) — primary source, no TMDB dependency.
- Playback blocker (exact step): `CineStreamProvider.loadLinks` → `invokeAllSources(...)` → dozens of host extractors (GDLink, GDFlix, febbox, akwam, levidia, ...). Each extractor performs multi-step page fetches with host-specific referer/UA/cookies, JSoup HTML parsing, and media-link extraction using CloudStream-only primitives (`app.get`, `document`, `newExtractorLink`). That Kotlin/Android-dependent pipeline is not ported; no direct, keyless media URL endpoint was validated this session. Fixture playback is clearly labeled in the API response (`provider.resolution=local_fixture`, `resolution.status=fixture_fallback`, note text) and shown in the player.

## Remaining work

1. Port the first permitted extractor path from `CineStreamExtractors.kt` (single host, validate a real media URL end-to-end), then flip `supportsStreamResolution`.
2. Optional: per-endpoint search timeouts after collecting more latency data; browser-level UI QA.