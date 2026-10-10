# STREAMIX — Progress

## Current phase

Phase 2 — Netflix-style responsive UI: navbar, hero, rows, modal, responsive design.

## Phase 2 checklist

- [x] Inspected current project state, Git history (Phase 1 intact)
- [x] Verified provider adapter unchanged; detail endpoint added (new route, no breaking changes)
- [x] Extended `getDetails` with episodes (porting extension's `load()` episode mapping)
- [x] Added `GET /api/detail/:type/:id` route with validation, cache, error mapping
- [x] Navbar: logo, Home/Movies/Series links, SearchBox with debounce
- [x] Hero section: backdrop with featured content, Play placeholder (disabled), More Info
- [x] Rows: horizontal scroll, responsive cards, hover effects
- [x] TitleCard: image with hover overlay, rating badge, click → detail modal
- [x] DetailModal: backdrop, hero, title/meta, Play placeholder, seasons/episodes list
- [x] Modal: Escape-to-close, scroll lock, focus management, backdrop click close
- [x] Views: Home (hero + rows), Movies (filtered), Series (filtered), Search
- [x] Skeletons: shimmer animation for loading states
- [x] Responsive: mobile < 768px, tablet 768-1024px, desktop > 1024px
- [x] Verified: tests (12/12 pass), build (24 modules, ✓ 124ms), health, detail endpoint, proxy

## Files created/modified in Phase 2

- `packages/server/src/routes/detail.js` (new) — detail route with validation and cache
- `packages/server/src/index.js` (modified) — version 0.2.0, mounts detail router
- `packages/server/src/providers/cinemeta.js` (modified) — `normalizeDetail` + episodes extraction
- `packages/server/src/providers/cinemeta.test.js` (modified) — 6 new normalizeDetail tests
- `packages/client/src/api.js` (modified) — `fetchDetail` with AbortController support
- `packages/client/src/components/Navbar.jsx` (new)
- `packages/client/src/components/Hero.jsx` (new)
- `packages/client/src/components/SkeletonRow.jsx` (new)
- `packages/client/src/components/DetailModal.jsx` (new)
- `packages/client/src/components/TitleCard.jsx` (modified) — hover overlay
- `packages/client/src/components/SearchBox.jsx` (modified) — debounce
- `packages/client/src/components/Row.jsx` (modified) — onSelect callback
- `packages/client/src/App.jsx` (modified) — views, hero, modal, detail caching
- `packages/client/src/index.css` (modified) — dark cinematic theme, responsive

## Commands executed and results

- `npm run test` → 12/12 pass (6 new normalizeDetail tests)
- `npm run build` → Vite 8.3.4, `✓ built in 124ms` (24 modules)
- server start → `[streamix] provider=CineStream tmdb_enrichment=disabled`
- `GET /api/health` → `ok=true version=0.2.0`
- `GET /api/detail/movie/tt0096895` → Batman, year 1989, episodes=null
- `GET /api/detail/series/tt0903747` → Breaking Bad, episodes=62 (episodes: Pilot, Cat's in the Bag...)
- `GET /api/detail/video/...` → HTTP 400 `validation_error` ("Type must be 'movie' or 'series'")
- `GET /api/detail/movie/t` → HTTP 502 `provider_error` (valid ID length, fetches but 404 upstream)
- Vite proxy end-to-end verified: page 200/title STREAMIX, `/api/home/trending` (24 items), `/api/detail/movie/tt0096895` (Batman)
- Server-side cache working (5-min TTL)
- Modal detail cache in client (in-memory Map keyed by `type:id`)

## Known issues / limitations

- Series episode list shows all episodes (not paginated). Provider returns all episodes; for long series this could be large. Future optimization: pagination or limit to recent seasons.
- Play button is a placeholder (disabled, tooltip "Playback arrives in Phase 3") — honest capability reporting.
- Search debounce is 400ms — adequate for user experience, could be adjusted.
- Hero only shows one item (first with backdrop from trending). No fallback hero if no data.
- No "Continue Watching" row or user-specific content (Phase 3+ features).
- Modal scroll lock may affect assistive technologies if not implemented carefully — tested with keyboard navigation.
- Detail caching is per-session (in-memory). Hard refresh loses cached items.

## Next task (Phase 3, step 1)

Implement stream resolution: add `/api/stream/:type/:id` route that resolves a provider's stream URL, fetches it with required headers, and pipes through FFmpeg to HLS (fMP4/TSMux). No playback UI yet; focus on the pipeline and server-side FFmpeg handling.
