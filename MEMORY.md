# STREAMIX Project Memory

## Complete project goal

STREAMIX is a responsive Netflix-style website for discovering and watching movies and series from real CloudStream/CSX provider implementations. It will perform real provider search and discovery, resolve real playable sources while retaining required request headers, and send supported sources such as MKV through a server-managed FFmpeg-to-HLS pipeline for browser playback with hls.js. Playback must support seeking, fullscreen controls, subtitles where genuinely available, and switching among the audio tracks actually present in the source.

The project must never substitute invented catalog entries, provider responses, stream URLs, track lists, or playback claims for real behavior.

## Authoritative provider fact

The CSX plugin repository manifest is:

`https://raw.githubusercontent.com/SaurabhKaperwan/CSX/builds/CS.json`

This URL describes available plugins. It is not a video stream. CloudStream `.cs3` extensions generally package Kotlin/Android code and cannot run directly inside Node.js. Provider integration therefore requires inspecting the relevant extension's real source and porting or reimplementing its provider and extractor logic for the server runtime.

## Implementation phases

### Phase 0: Foundation, documentation, Git, and verified development setup

- Establish permanent project memory, engineering constraints, progress tracking, and secret-handling rules.
- Initialize a minimal React + Vite frontend and Node.js + Express backend.
- Add a basic responsive page, an HTTP health endpoint, development scripts, and environment examples.
- Verify dependency installation, production build, backend tests, and a live HTTP health check.
- Document the later playback architecture without implementing providers, the Netflix UI, or the player.

### Phase 1: Dynamic content engine

- Inspect the CSX manifest and actual source of selected CloudStream extensions.
- Select a legally usable initial provider and port its real search, discovery, detail, episode, and extractor logic into a provider adapter.
- Normalize only fields returned by the provider and preserve required headers.
- Add real search and discovery APIs with failure reporting and tests based on real behavior or sanitized captures where permitted.
- Optionally enrich matching items with TMDB metadata when a user-supplied API key is configured; TMDB is never a stream source.

### Phase 2: Netflix-style responsive experience

- Build a distinctive responsive homepage driven by the Phase 1 content APIs.
- Add search/discovery loading, empty, degraded, and error states.
- Implement a same-page movie/series details modal.
- For series, expose real seasons and episodes supplied by the provider.
- Preserve accessibility, keyboard navigation, focus management, and mobile usability.

### Phase 3: Stream resolution and playback

- Resolve real provider stream URLs with their required headers, cookies, and referers.
- Probe supported inputs with FFprobe, then use a constrained server-side FFmpeg process to generate session-scoped HLS.
- Play HLS through hls.js where Media Source Extensions are needed, with native HLS fallback where supported.
- Support seeking, fullscreen, subtitles, and audio switching based only on discovered source tracks.
- Apply process limits, SSRF defenses, cleanup, cancellation, timeouts, and structured failure reporting.

### Phase 4: Reliability, fallback, and polish

- Add provider fallback with observable, bounded retry behavior.
- Add safe caches with explicit TTLs and invalidation boundaries for discovery, details, and resolved sources.
- Optimize provider selection for Hindi and English content without inventing availability.
- Improve responsive polish, playback resilience, recovery UX, monitoring, and resource cleanup.
- Validate the full system against representative real movies, series, sources, audio layouts, and subtitle formats.

## Planned playback integration

1. A Phase 1 provider adapter returns a real media candidate and the exact HTTP headers required to request it.
2. The backend validates the destination and request metadata, prevents access to private/internal networks, and creates a bounded playback session.
3. FFprobe inspects the input to identify containers, codecs, audio streams, language/title metadata, and subtitle streams.
4. FFmpeg receives arguments directly, not through a shell string. Compatible video/audio may be remuxed; incompatible streams are transcoded according to an explicit profile.
5. The HLS output contains a master playlist and renditions. Each real audio stream is mapped into an HLS audio group with accurate language/name metadata. Supported subtitle streams are converted or packaged into web-compatible renditions.
6. Express exposes only session-scoped manifests and segments, with correct content types, range/cache behavior, expiry, cancellation, and cleanup.
7. The React player uses hls.js on browsers that support Media Source Extensions and uses native HLS where appropriate. Its menus are populated from manifest/discovery data, so only real tracks appear.
8. Audio selection uses hls.js audio-track APIs. Subtitle selection uses supported text-track/subtitle APIs. Seeking and fullscreen remain standard player controls over the generated HLS timeline.

This is architectural documentation only. No provider resolution, FFmpeg session, HLS output, or full player is part of Phase 0.

## Security and configuration memory

- Secrets belong in ignored local `.env` files or an external secret store.
- Repository files contain placeholders only.
- Provider input is untrusted. URLs, redirects, headers, payloads, filenames, and media metadata require validation.
- FFmpeg and network work must have concurrency, duration, disk, bandwidth, and timeout limits before public exposure.
