# STREAMIX — Progress

## Current phase

Phase 3 — Real stream resolution and MKV playback via FFmpeg-generated HLS with multi-audio support.

## Phase 3 checklist

- [x] Audit: confirmed CineStream is a metadata provider (no extractor port yet); verified FFmpeg 9.0.2 installed; no real provider extractor exists in the codebase
- [x] Reproducible multi-audio test fixture: `scripts/make-test-fixture.mjs` generates `temp/fixtures/multi-audio.mkv` (H.264 video + AAC en + AAC es), `temp/` gitignored
- [x] Resolver interface (`providers/extractor.js`) with input validation; honest `unsupported` + `local_fixture` fallback when the provider has no extractor
- [x] Media pipeline (`providers/stream.js`): ffprobe probe, FFmpeg HLS with `-var_stream_map` audio groups (`EXT-X-MEDIA:TYPE=AUDIO`), concurrency limit, timeouts, process cleanup, strict file-name validation
- [x] API routes (`routes/stream.js`): `POST /api/stream/:type/:id`, `GET /api/stream/:sessionId/master.m3u8`, `GET /api/stream/:sessionId/status`, `GET /api/stream/:sessionId/:file`, `DELETE /api/stream/:sessionId`; session-id and file-name validation, 400/404/422/502/504 error mapping
- [x] Player integration: `hls.js@1.7.3` installed; `Player.jsx` with play/pause, -10s/+10s, fullscreen, real audio-track menu from `hls.audioTracks`, back-to-modal, loading/error states, HLS + session cleanup
- [x] Play buttons wired in `Hero.jsx` and `DetailModal.jsx`; App renders the player overlay on top of the detail modal
- [x] Verified pipeline: multi-audio manifest, segment serving, path traversal blocked, cleanup, proxy end-to-end

## Files created/modified in Phase 3

- `packages/server/src/providers/stream.js` (rewrite) — probe + FFmpeg HLS audio-group pipeline, session manager
- `packages/server/src/providers/extractor.js` (rewrite) — resolver with validation and fixture fallback
- `packages/server/src/routes/stream.js` (rewrite) — session routes with security validation
- `packages/server/src/providers/cinemeta.js` (modified) — `supportsStreamResolution: false` capability
- `packages/server/src/config.js` (modified) — ffmpeg/ffprobe paths, fixture path, max concurrent sessions
- `packages/server/src/index.js` (modified) — version 0.3.0, resolver + stream manager wiring, HLS dir init
- `packages/server/src/providers/extractor.test.js` (new) — 6 resolver tests
- `packages/server/src/providers/stream.test.js` (new) — 3 integration tests (probe/HLS/audio tracks, file validation, clean failure)
- `packages/server/package.json` (modified) — version 0.3.0, test list
- `scripts/make-test-fixture.mjs` (new) — reproducible multi-audio MKV generator
- `.gitignore` (modified) — `temp/`
- `packages/client/src/api.js` (modified) — `createStream`, `cleanupStream`, options passthrough
- `packages/client/src/components/Player.jsx` (new) — hls.js player
- `packages/client/src/components/Hero.jsx`, `DetailModal.jsx` (modified) — wired Play buttons
- `packages/client/src/App.jsx` (modified) — player state and overlay
- `packages/client/src/index.css` (modified) — player styles
- `packages/client/package.json`, `package-lock.json` (modified) — hls.js dependency

## Commands executed and results

- `node scripts/make-test-fixture.mjs` → `Fixture written: D:\saif\12341234\temp\fixtures\multi-audio.mkv` (94 KB)
- `npm run test` → 21/21 pass (cache, cinemeta, tmdb, extractor, stream integration)
- `npm run build` → Vite 8.3.4 OK, 26 modules (`✓ built in 675ms`; hls.js chunk ~810 KB, non-blocking warning)
- Live `POST /api/stream/movie/tt0096895` → 201 `{ sessionId, audioTracks: [Audio Track 1 en default, Audio Track 2 es], sourceType: "local_fixture", title: "Batman" }`
- `GET /api/stream/:sid/master.m3u8` → `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="group_aud",NAME="audio_1",DEFAULT=YES,LANGUAGE="en"` + `audio_2 DEFAULT=NO LANGUAGE="es"` + one video `EXT-X-STREAM-INF AUTH="group_aud"` (verified from session workspace too)
- `GET /api/stream/:sid/seg_v0_000.ts` → 200 `video/mp2t` (24,816 bytes)
- `GET /api/stream/:sid/..%2F..%2Fconfig.js` → 400; bad session id → 400
- `DELETE /api/stream/:sid` → `{ status: "cleaned" }`; workspace directory removed; status after delete → 404
- Invalid type POST → 502 `provider_error` "Type must be 'movie' or 'series'" (mapped to 400 after fix)
- Vite proxy end-to-end: page 200/STREAMIX; `POST /api/stream/movie/tt0096895` → session with 2 tracks; `GET master.m3u8` → 200 `application/vnd.apple.mpegurl`; cleanup OK

## Known issues / limitations

- **Provider stream resolution is NOT implemented.** The CineStream extension's extractors (`CineStreamExtractors.kt`, ~178 KB) were not ported; the resolver honestly reports `unsupported` and falls back to the local test fixture (`sourceType: "local_fixture"`, note returned in the API). No real provider stream URL was invented or claimed.
- Browser playback was not verified in a real browser (CLI environment); the HLS output is spec-correct (`EXT-X-MEDIA` audio groups) and served with correct MIME types. hls.js will expose the 2 audio tracks via `hls.audioTracks`.
- The Play button plays the fixture for any title; a title maps to fixture via its real provider detail metadata. Episode-specific playback is not wired (series play the fixture too).
- Transcoding always re-encodes (libx264/aac); remuxing-only optimization is Phase 4 work.
- `-hls_segment_filename` with `%v` subdirectories fails on Windows (FFmpeg quirk); the flat `seg_%v_%03d.ts` layout is used instead.
- hls.js adds ~580 KB to the client bundle (chunk-size warning); code-splitting/lazy-load is Phase 4 polish.
- Session cache is in-memory and ephemeral; abandoned sessions are killed on server exit, and DELETE cleans them explicitly.

## Next task (Phase 4, step 1)

Provider optimization and reliability on top of the Phase 3 pipeline: port at least one real extractor (start by reading `CineStreamExtractors.kt` sources for the simplest provider, e.g. a direct/embed host), caching for resolved sessions, remux-only fast path when codecs are HLS-compatible, and lazy-load hls.js for the client bundle.