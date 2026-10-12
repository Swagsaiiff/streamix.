# STREAMIX — Progress

## Current phase

Post-Phase-5 restoration: CSX catalog/search/poster repair and playback honesty (requested repair work).

## Mandatory bug-fix round (visible failures, browser-verified)

### Reproduced (browser harness: Puppeteer-core + Edge, computed styles + image network checks)

1. Poster boxes had `width: 0` (poster images collapsed); 35/72 home posters dead.
2. `.card-title` and `.card-meta` computed `display: inline` — titles, media types, years, ratings ran together on one line.
3. Root cause of 1+2: the Phase-5 TitleCard rewrite used `<span>` containers whose CSS (`width`, `padding-top`, `white-space`, `overflow`, `text-overflow`) only works on block boxes, but the spans were left inline.
4. Search backend was 404 (`/api/search` mount mismatch) in the prior state; UI results were gated behind a `view === "search"` that nothing ever set.
5. Catalog responses were blocked on serial, timeout-less TMDB lookups; the shared route/TMDB cache (500 entries) let TMDB inserts evict route responses, causing constant upstream refetch + re-enrich churn ("pending" forever) and slower loads.
6. Trending and Latest drew from the same catalog slice (19/24 identical titles).
7. Row headers exposed provider jargon (`ranking` strings) to visitors.

### Fixes implemented and verified in-browser

- `index.css`: `.card-poster`, `.card-title`, `.card-meta` are `display: block`; `.card` gets a fixed `width: 150px` (120px mobile); poster box measures exactly 150x225 (2:3); title and metadata are separate block elements; placeholder stays behind lazy posters.
- `App.jsx`: search sets `view: "search"`, clear returns home, latest-query guard prevents stale overwrite.
- `index.js`: dedicated caches — `routeCache` (200), `providerCache` (200), `tmdbCache` (2000, 24h) — no more cross-eviction between routes and TMDB lookups.
- `home.js`: enrichment runs in background on the displayed 24-item slice only; honest section titles "Top Movies" / "Newest Movies" / "Top Series"; "Newest Movies" sourced from a separate catalog band (skip 147+, 5 pages, newest-first, documented in the API `ranking`).
- `cinemeta.js`: `getTopMovies/getTopSeries` accept a `startSkip` so sections can draw from different catalog positions.
- `Row.jsx`/`App.jsx`: `ranking` jargon no longer rendered (still present in API payloads).
- `index.html`: data-URI favicon removes the stray 404 console error.

### Browser verification (Puppeteer + Edge, real page at localhost:5173)

- Home: 72 cards; computed `posterBox 150x225`; `titleDisplay`/`metaDisplay = block`; `loadedImages 72/72`, `broken 0`; console errors `[]`; row titles "Top Movies | Newest Movies | Top Series".
- Search "from": 54 cards, first "From Dusk Till Dawn (1996)"; after horizontal scroll `54/54` posters loaded.
- Search "dune": 23 cards, first "Dune (2021)".
- Clear: catalog restored (72 cards, 72/72 posters).
- API: trending 24/24 and latest 24/24 items carry poster fields without TMDB; overlap trending-vs-latest now `0/24`; first catalog response returns in 0.2-0.3 s with `enrichment.status=pending`, then `enabled` on the next fetch; third fetch `0.004 s` (stable cache).
- Search endpoint timing: cached searches `0.00-0.13 s`; cold 0.4-5.4 s (upstream warm-up); direct upstream probes 71-470 ms.
- `npm run test` → 34/34 pass; `npm run build` → OK (main 238 kB, lazy hls 575 kB).

### Files changed in this round

- `packages/client/src/index.css`, `packages/client/src/components/Row.jsx`, `packages/client/src/App.jsx`, `packages/client/index.html`
- `packages/server/src/index.js`, `packages/server/src/routes/home.js`, `packages/server/src/providers/cinemeta.js`

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
