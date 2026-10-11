# STREAMIX — Progress

## Current phase

Phase 4 — Provider reliability and language optimization.

## Real-provider playback status (unresolved blocker)

- No configured provider has been verified end-to-end (real provider page → actual media URL → HLS playback in browser).
- CineStream remains a metadata-only provider: `supportsStreamResolution: false`. Its extractors (`CineStreamExtractors.kt` etc.) are not ported.
- The application must NOT be labeled as supporting live provider playback. `GET /api/providers/status` reports `verifiedRealProviderPlayback: false` and the blocker text; stream sessions report `resolution.status: "fixture_fallback"` and `sourceType: "local_fixture"`.

## Phase 4 checklist

- [x] Audit: verified claims against code; one configured provider (CineStream), no real stream playback verified; confirmed FFmpeg pipeline intact
- [x] Provider registry with typed interface and telemetry: `listConfiguredProviders`, `getProviderStatuses`, per-provider outcome tracking (successes/failures/lastSuccess/lastError)
- [x] Resolver fallback rules: bounded retries (default 2) for retryable errors (timeout/network/http); permanent errors (not_found/validation/unsupported) are never retried and never fall through; fallback to next configured provider only after retryable exhaustion; concurrent duplicate resolution deduped per `type:id`
- [x] Error taxonomy standardized in `errors.js` with secret-safe client messages (validation 400, not_found 404, access_denied 403, timeout 504, unsupported 422, upstream 502, internal 500); applied to home/search/detail/stream routes
- [x] Structured secret-safe logging (`logger.js`) at server start, stream resolve/create/cleanup, no credentials or full source URLs logged
- [x] Hindi/English optimization: `PREFERRED_AUDIO_LANGUAGE` env default `en`; `GET /api/stream/...?lang=` override; default HLS audio track chosen only when real track language metadata matches (ffprobe tags); unknown tracks are never labeled with a language; client stores a per-user language preference and applies it on next play; manual track selection always available
- [x] Caching: reviewed existing TTL caches (catalog/search/detail 5 min, TMDB 24 h, bounded 500 entries); added `delete`/`clear` invalidation; stream-resolution results are NOT cached (only the static server-controlled fixture is used) and signed/expiring URLs are never cached by design
- [x] Observability: provider status endpoint, telemetry, structured logs; health contract unchanged
- [x] Regression tests: 30/30 pass (fallback-after-retryable, no-fallback-on-permanent, dedupe, cache invalidation, preferred-language with real metadata, unknown-language honesty, session isolation, multi-audio HLS preserved, all prior tests)

## Files created/modified in Phase 4

- `packages/server/src/errors.js` (new) — standardized error mapping + safe messages
- `packages/server/src/logger.js` (new) — structured JSON logger
- `packages/server/src/providers/index.js` (rewrite) — registry, telemetry, provider statuses
- `packages/server/src/providers/base.js` (modified) — `isRetryableError`, `onOutcome` hooks
- `packages/server/src/providers/extractor.js` (rewrite) — retries, fallback, dedupe, provider/source status
- `packages/server/src/providers/stream.js` (modified) — `buildAudioLayout(audios, preferredLanguage)` exported, session preferred language
- `packages/server/src/config.js` (modified) — `preferredAudioLanguage`
- `packages/server/src/routes/stream.js` (modified) — `?lang=`/`?preferredLanguage=`, provider+resolution in response, sendError
- `packages/server/src/routes/providers.js` (new) — `GET /api/providers/status`
- `packages/server/src/routes/home.js`, `search.js`, `detail.js` (modified) — sendError
- `packages/server/src/cache.js` (modified) — `delete`, `clear`, `size`
- Tests: `extractor.test.js` (rewrite), `stream.test.js` (extended), `cache.test.js` (extended)
- `packages/client/src/api.js` (modified) — `createStream` accepts `lang`
- `packages/client/src/components/Player.jsx` (modified) — lang preference select, localStorage persistence, applies on play and immediately when a matching track exists
- `.env.example` (modified) — `PREFERRED_AUDIO_LANGUAGE`

## Commands executed and results

- `npm run test` → 30/30 pass
- `npm run build` → Vite 8.3.4 OK (26 modules; hls.js chunk warning unchanged)
- server start → structured log `{"level":"info","msg":"hls.workspace_ready"}`
- `GET /api/providers/status` → `verifiedRealProviderPlayback: false`, CineStream `supportsStreamResolution: false`
- `POST /api/stream/movie/tt0096895?lang=es` → `preferredLanguage: "es"`, 2 tracks, `resolution.status: fixture_fallback`, provider CineStream/local_fixture
- `POST /api/stream/series/tt0903747` (no lang) → `preferredLanguage: "en"`
- `POST /api/stream/movie/tt0096895?lang=hi` (no match) → `preferredLanguage: "en"` (first track; unknown tracks never labeled `hi`)
- `POST /api/stream/video/...` → HTTP 400 `validation_error`
- Telemetry after 3 session creations → `{ successes: 3, failures: 0 }`
- es session master.m3u8 still has 2 `EXT-X-MEDIA:TYPE=AUDIO` groups (multi-audio regression OK)
- Vite proxy: page 200, stream with `?lang=es` → `defaultLang=es`, playlist 200 `application/vnd.apple.mpegurl`, providers status honest, cleanup OK

## Known issues / limitations

- Real provider playback remains unverified (blocker above). All playback is fixture-backed.
- Only one provider is configured, so cross-provider fallback is framework-tested with mocks only; no real two-provider fallback exists yet.
- Retry backoff is fixed (200 ms × attempt); no jitter/exponential policy yet.
- Language preference is client-side localStorage plus server env; there is no server-side per-user profile.
- No caching of stream-resolution results (intentional; avoids expiring signed URLs); fixture path is static and server-controlled.
- hls.js bundle chunk warning persists (~810 KB) — code-splitting flagged for Phase 5 polish.

## Next tasks (Phase 5)

1. Port the first real provider extractor end-to-end (start from `CineStreamExtractors.kt`, simplest host) and verify a real provider page → media URL → HLS session, then flip `supportsStreamResolution` and re-run the full suite.
2. Lazy-load hls.js (`import()`), and add jittered exponential retry backoff.