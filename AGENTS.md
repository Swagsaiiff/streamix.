# STREAMIX Engineering Rules

These rules apply to every phase and every contributor.

## Scope and workflow

- Work in the current implementation phase only. Do not pre-build later phases.
- Break work into small, reviewable, verifiable changes.
- Update `PROGRESS.md` after each task with changed files, commands and observed results, known issues, and the exact next task.
- Inspect existing code before editing it. Preserve unrelated user changes.
- Prefer the smallest correct implementation and avoid speculative abstractions or compatibility layers.
- Never claim functionality or a passing test without direct evidence.

## Content integrity

- Use real provider responses only. Never invent titles, metadata, search results, provider results, stream URLs, tracks, subtitles, or successful playback.
- The CSX manifest at `https://raw.githubusercontent.com/SaurabhKaperwan/CSX/builds/CS.json` is a plugin repository manifest, not a playable media URL.
- CloudStream `.cs3` packages generally contain Kotlin/Android implementations. They cannot be executed directly by Node.js.
- Before integrating a provider, inspect its actual extension source and legally port or reimplement the required provider and extractor behavior.
- Preserve provider-required request headers, cookies, and referers through stream resolution and media ingestion. Never log secrets or sensitive session values.
- Respect applicable law, provider terms, and content access rights. Do not bypass DRM or access controls.

## Protected architecture

- Keep provider discovery/resolution separate from metadata enrichment, UI state, and playback/transcoding.
- Treat TMDB as optional metadata enrichment, never as a stream source.
- The playback boundary is: real resolved provider URL plus required headers -> server-managed FFmpeg process -> generated HLS -> browser playback through hls.js.
- The browser must not receive arbitrary credentials or invoke unrestricted FFmpeg commands.
- Validate and allowlist all inputs crossing the provider and FFmpeg boundaries. Construct FFmpeg arguments as an argument array, never by concatenating a shell command.
- Keep generated HLS output outside source-controlled paths and delete expired sessions.
- Preserve every available audio stream deliberately during transcoding. Expose only audio tracks that FFprobe/FFmpeg actually discovers.
- Preserve supported subtitles and their real language/title metadata. Do not advertise unavailable tracks.
- Keep multi-audio playback, audio switching, subtitles, seeking, and fullscreen as core Phase 3 requirements.
- Do not weaken provider fallback, caching boundaries, process limits, timeouts, cleanup, or SSRF protections for convenience.

## Coding rules

- Use modern JavaScript modules consistently in frontend and backend code.
- Keep frontend and backend responsibilities explicit; provider credentials and FFmpeg execution remain server-side.
- Validate environment configuration at the boundary and provide safe examples in `.env.example` files.
- Never commit API keys, tokens, cookies, resolved private URLs, generated media, `.env` files, or other secrets.
- Return stable, structured JSON errors from APIs without leaking internal stack traces in production.
- Add dependencies only when they provide clear value and keep them maintained and minimal.
- Keep the UI responsive and accessible: semantic elements, keyboard access, visible focus, sufficient contrast, and reduced-motion awareness.

## Testing requirements

- Run installation after dependency changes and record the actual result.
- Run the production frontend build for every frontend change.
- Run backend automated tests for backend behavior; health-check work must exercise the endpoint over HTTP as well.
- In later phases, add contract tests around provider parsing using captured, sanitized fixtures where permitted; never fabricate live success.
- In Phase 3, verify FFprobe discovery, FFmpeg argument construction, HLS manifests, each available audio track, subtitle behavior, seeking, cleanup, failure handling, and process limits.
- Test responsive behavior at representative mobile and desktop widths when UI work begins.
- A skipped, unavailable, or flaky external-provider check must be reported as such, not marked passed.
- Fix failures caused by the current phase before moving on. Record unrelated or external blockers in `PROGRESS.md`.

## Git rules

- Review generated files and test results before each checkpoint.
- Keep commits focused and never include secrets, dependency caches, build output, logs, or generated HLS media.
- Do not rewrite shared history or discard changes that were not created by the current task.
