import { useEffect, useRef, useCallback } from "react";

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function DetailModal({ modal, onClose, onPlay, suppressEscape = false }) {
  const { item, detail, state } = modal;
  const closeRef = useRef(null);
  const restoreRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    restoreRef.current = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") {
        if (suppressEscape) return;
        e.preventDefault();
        onClose();
      }
      if (e.key !== "Tab" || !container) return;
      const focusables = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      restoreRef.current?.focus?.();
    };
  }, [onClose, suppressEscape]);

  const backdrop = detail?.backdrop ?? item.backdrop ?? detail?.poster ?? item.poster;
  const genres = detail?.genres ?? item.genres;

  const groupedEpisodes = useCallback(() => {
    if (!detail?.episodes || detail.episodes.length === 0) return [];
    const map = new Map();
    for (const ep of detail.episodes) {
      const list = map.get(ep.season) ?? [];
      list.push(ep);
      map.set(ep.season, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [detail]);

  const seasons = groupedEpisodes();

  return (
    <div
      className="modal-overlay"
      ref={containerRef}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button
          ref={closeRef}
          className="modal-close"
          onClick={onClose}
          aria-label="Close details"
        >
          ×
        </button>
        <div className="modal-hero" style={backdrop ? { backgroundImage: `url(${backdrop})` } : undefined}>
          <div className="modal-hero-shade" />
        </div>
        <div className="modal-body">
          <h2 id="modal-title">{detail?.title ?? item.title}</h2>
          <p className="modal-meta">
            {item.type}
            {detail?.year ? ` · ${detail.year}` : item.year ? ` · ${item.year}` : ""}
            {detail?.rating ? ` · ${detail.rating}` : item.rating ? ` · ${item.rating}` : ""}
            {genres?.length ? ` · ${genres.join(", ")}` : ""}
          </p>
          <button
            className="btn btn-play"
            disabled={!onPlay}
            onClick={() => onPlay?.(item)}
            title={onPlay ? "Play" : "Playback is not available for this title"}
          >
            Play
          </button>
          {state === "loading" && (
            <div className="skeleton-block" aria-label="Loading details" />
          )}
          {state === "error" && (
            <p className="err">Could not load details from the provider.</p>
          )}
          {state === "done" && (
            <>
              <p className="modal-overview">{detail?.overview ?? item.overview ?? "No overview available."}</p>
              {detail?.type === "series" && (
                <>
                  {detail.episodes && detail.episodes.length > 0 ? (
                    <div className="episodes">
                      {seasons.map(([season, eps]) => (
                        <div key={season} className="season">
                          <h3>Season {season}</h3>
                          <ul className="episode-list">
                            {eps.map((ep) => (
                              <li key={ep.id ?? `${ep.season}-${ep.episode}`} className="episode">
                                <span className="episode-num">{ep.episode}</span>
                                <div className="episode-info">
                                  <span className="episode-name">{ep.name ?? `Episode ${ep.episode}`}</span>
                                  {ep.overview && <span className="episode-overview">{ep.overview}</span>}
                                </div>
                                {ep.firstAired && (
                                  <span className="episode-date">
                                    {ep.firstAired.slice(0, 10)}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">Episodes are not available from the provider for this title.</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}