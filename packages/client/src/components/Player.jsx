import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { createStream, cleanupStream } from "../api.js";

export default function Player({ item, onClose }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const sessionRef = useRef(null);
  const abortRef = useRef(null);
  const [phase, setPhase] = useState("resolving");
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [audioTracks, setAudioTracks] = useState([]);
  const [activeTrack, setActiveTrack] = useState(null);
  const [availableLangs, setAvailableLangs] = useState([]);
  const [preferredLang, setPreferredLang] = useState(
    () => localStorage.getItem("streamix.lang") || ""
  );
  const [fullscreen, setFullscreen] = useState(false);
  const [sourceNote, setSourceNote] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    abortRef.current = controller;

    async function start() {
      try {
        const stream = await createStream(item.type, item.id, {
          signal: controller.signal,
          lang: preferredLang || undefined
        });
        if (cancelled) return;
        sessionRef.current = stream.sessionId;
        setSourceNote(stream.note ?? null);

        const video = videoRef.current;
        if (!video) return;

        if (!Hls.isSupported()) {
          if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = stream.playlistUrl;
            video.addEventListener("loadedmetadata", () => setPhase("ready"), { once: true });
            return;
          }
          throw new Error("HLS playback is not supported in this browser");
        }

        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(stream.playlistUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (cancelled) return;
          const tracks = hls.audioTracks ?? [];
          setAudioTracks(tracks);
          setAvailableLangs(
            Array.from(new Set(tracks.map((t) => t.lang).filter(Boolean)))
          );
          if (preferredLang) {
            const match = tracks.find((t) => t.lang === preferredLang);
            if (match) hls.audioTrack = match.id;
          }
          setPhase("ready");
          video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        });

        hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
          setActiveTrack(data.id);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (cancelled) return;
          if (data.fatal) {
            setError(`Playback error: ${data.details ?? data.type}`);
            setPhase("error");
            try {
              hls.destroy();
            } catch {
              // Already destroyed
            }
          }
        });
      } catch (err) {
        if (cancelled || err.name === "AbortError") return;
        setError(err.message || "Failed to resolve the stream");
        setPhase("error");
      }
    }

    start();

    return () => {
      cancelled = true;
      controller.abort();
      try {
        hlsRef.current?.destroy();
      } catch {
        // Already destroyed
      }
      if (sessionRef.current) {
        cleanupStream(sessionRef.current);
      }
    };
  }, [item]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [phase]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "ArrowLeft") skip(-10);
      if (e.key === "ArrowRight") skip(10);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setPlaying(false);
    }
  }, []);

  const skip = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    video.currentTime = target;
  }, []);

  const selectAudio = useCallback((id) => {
    if (!hlsRef.current) return;
    hlsRef.current.audioTrack = Number(id);
    setActiveTrack(Number(id));
  }, []);

  const setLanguagePreference = useCallback((lang) => {
    setPreferredLang(lang);
    if (lang) {
      localStorage.setItem("streamix.lang", lang);
    } else {
      localStorage.removeItem("streamix.lang");
    }
    const hls = hlsRef.current;
    const match = hls?.audioTracks?.find((t) => t.lang === lang);
    if (match) hls.audioTrack = match.id;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen().catch(() => {});
    }
  }, []);

  const audioMenu = audioTracks.length > 0 ? (
    <label className="player-audio">
      <span>Audio</span>
      <select
        value={activeTrack ?? audioTracks[0]?.id ?? ""}
        onChange={(e) => selectAudio(e.target.value)}
      >
        {audioTracks.map((track) => (
          <option key={track.id} value={track.id}>
            {track.name}
            {track.lang ? ` (${track.lang})` : ""}
          </option>
        ))}
      </select>
    </label>
  ) : (
    <span className="player-audio muted">No selectable audio tracks</span>
  );

  const languageMenu = availableLangs.length > 0 ? (
    <label className="player-audio">
      <span>Lang pref</span>
      <select
        value={preferredLang}
        onChange={(e) => setLanguagePreference(e.target.value)}
      >
        <option value="">Default</option>
        {availableLangs.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>
    </label>
  ) : null;

  return (
    <div className="player" ref={containerRef} role="dialog" aria-modal="true" aria-label={`Playing ${item.title}`}>
      <div className="player-topbar">
        <button className="player-back" onClick={onClose}>
          Back
        </button>
        <span className="player-title">{item.title}</span>
        {sourceNote && <span className="player-source">{sourceNote}</span>}
      </div>

      <div className="player-stage">
        {phase === "resolving" && (
          <div className="player-status">Resolving stream and preparing HLS...</div>
        )}
        {phase === "error" && (
          <div className="player-status err">{error}</div>
        )}
        <video ref={videoRef} className="player-video" playsInline onClick={togglePlay} />
        {phase === "ready" && !playing && (
          <button className="player-play-overlay" onClick={togglePlay} aria-label="Play">
            Play
          </button>
        )}
      </div>

      <div className="player-controls">
        <button onClick={togglePlay}>{playing ? "Pause" : "Play"}</button>
        <button onClick={() => skip(-10)}>-10s</button>
        <button onClick={() => skip(10)}>+10s</button>
        {audioMenu}
        {languageMenu}
        <button onClick={toggleFullscreen}>{fullscreen ? "Exit Fullscreen" : "Fullscreen"}</button>
      </div>
    </div>
  );
}
