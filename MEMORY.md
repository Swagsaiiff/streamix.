# STREAMIX — Project Memory

## Goal

Build a responsive Netflix-style movie and series streaming website using real content from CloudStream/CSX provider implementations. Resolve actual provider streams and play supported MKV sources through FFmpeg-generated HLS, with audio-track switching and subtitle support where available. Hindi and English content coverage is targeted via provider optimization in later phases. Nothing is faked: content, results, streams, and playback success are only ever reported from real observed requests.

## Hard technical facts

- CSX manifest: `https://raw.githubusercontent.com/SaurabhKaperwan/CSX/builds/CS.json` — a plugin repository manifest used to discover provider extensions. It is NOT a playable video URL.
- CloudStream `.cs3` extensions generally contain Kotlin/Android code and cannot run directly in Node.js. A provider is supported by reading its real extension source and porting its search/detail/extractor logic to server-side JavaScript with real endpoints, parameters, and headers.
- Full rules live in `AGENTS.md`; they are permanent and override convenience.

## The five phases

- Phase 0 — Foundation: documentation, git, minimal React+Vite client and Node+Express server, health-check endpoint, verified dev setup. (current phase)
- Phase 1 — Dynamic content engine: parse the CSX manifest, port real provider logic (search + discovery) from actual extension sources, make real HTTP requests with required headers, optional TMDB metadata enrichment.
- Phase 2 — Netflix-style responsive UI: homepage rows and a same-page movie/series details modal with seasons and episodes, rendered exclusively from real Phase 1 data.
- Phase 3 — Playback: real provider stream resolution, server-side FFmpeg → HLS, hls.js player with audio-track switching, subtitles, seeking, and fullscreen.
- Phase 4 — Reliability: provider fallback, caching, Hindi/English provider optimization, responsive polish.

## Playback pipeline (Phase 3 integration plan — documented now, not implemented)

Flow: provider resolves a real media URL (mkv/mp4/m3u8) plus required headers → server fetches it and pipes through FFmpeg → FFmpeg emits HLS (segments + master playlist) → server streams it to the client → hls.js plays it.

- Remux first: `-c:v copy -c:a copy` to HLS when codecs are HLS-compatible (e.g. H.264/HEVC video, AAC audio). Transcode only when necessary (e.g. AC3/DTS audio, unsupported video), and never silently — report when transcoding occurs.
- MKV containers: FFmpeg demuxes MKV and remuxes to fMP4/MPEG-TS HLS segments. This is why MKV sources route through the pipeline instead of native playback.
- Multi-audio (core requirement): map the video once and every audio track (`-map 0:v:0 -map 0:a:0 -map 0:a:1 ...`), emit an HLS master playlist with `#EXT-X-MEDIA:TYPE=AUDIO` groups plus audio-only variant playlists so each track is a selectable rendition. The UI lists exactly the audio groups present in the master playlist; hls.js switches via `hls.audioTracks` / `hls.audioTrack = index`.
- Subtitles: use only subtitle tracks or URLs the provider actually exposes; serve external subs as WebVTT through the server proxy; use hls.js subtitle track selection when embedded in HLS. Expose only tracks that exist.
- hls.js: enable `enableWorker`; use `xhrSetup`/loader customization only if header passthrough is needed on segment requests; standard config otherwise.
- FFmpeg capability is checked at server boot and surfaced in logs; playback endpoints return a clear error when FFmpeg is missing. FFmpeg 9.0.2 is already installed on this machine (verified 2026-10-10 via `ffmpeg -version`).
- Security: only allowlisted provider hosts pass through the stream proxy; provider headers stay server-side; no arbitrary URL proxying.

## Environment

- Node v24.19.0, npm 11.17.0, Git installed (identity configured), FFmpeg 9.0.2 available.
- Ports: server `4000` (`PORT`), client Vite default `5173` with `/api` proxied to the server.
- Scripts (root): `npm run dev` (server + client together), `npm run dev:server`, `npm run dev:client`, `npm run build` (client production build), `npm start` (server), `npm run health` (health check against a running server).
- Env vars: see `.env.example` (placeholders only). `.env` is gitignored; real keys are never committed.

## Status

Detailed current status, test evidence, and the next task live in `PROGRESS.md`.
