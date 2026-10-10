import { useState, useEffect, useRef, useCallback } from 'react';

function DetailModal({ item, onClose }) {
  const [detail, setDetail] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);

  const fetchDetail = useCallback(async () => {
    if (!item?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/detail/${encodeURIComponent(item.id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDetail(data);
      if (data.seasons?.length) {
        setSelectedSeason(data.seasons[0].season);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [item?.id]);

  const fetchEpisodes = useCallback(async (season) => {
    if (!item?.id || item.type !== 'series') return;
    setEpisodesLoading(true);
    try {
      const res = await fetch(`/api/episodes/${encodeURIComponent(item.id)}/${season}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEpisodes(data.episodes || []);
    } catch (err) {
      console.error('Episodes fetch failed:', err);
      setEpisodes([]);
    } finally {
      setEpisodesLoading(false);
    }
  }, [item?.id, item?.type]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (item?.type === 'series' && selectedSeason) {
      fetchEpisodes(selectedSeason);
    }
  }, [item?.type, selectedSeason, fetchEpisodes]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const display = detail || item;
  const backdropUrl = display?.backdrop || display?.poster;
  const posterUrl = display?.poster;
  const year = display?.year || '';
  const rating = display?.rating ? `★ ${display.rating.toFixed(1)}` : '';
  const genres = display?.genres || [];
  const overview = display?.overview || '';
  const typeBadge = display?.type === 'series' ? 'Series' : 'Movie';
  const seasons = detail?.seasons || [];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={display?.title || 'Detail'}>
      <div className="modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <button ref={closeBtnRef} className="modal__close" onClick={onClose} aria-label="Close">✕</button>

        {backdropUrl && (
          <div className="modal__backdrop" style={{ backgroundImage: `url(${backdropUrl})` }}>
            <div className="modal__backdrop-gradient" />
          </div>
        )}

        <div className="modal__body">
          {loading ? (
            <div className="modal__loading">
              <div className="spinner" />
              <span>Loading details...</span>
            </div>
          ) : error ? (
            <div className="modal__error">
              <p>Failed to load details: {error}</p>
              <button className="btn btn--secondary" onClick={fetchDetail}>Retry</button>
            </div>
          ) : (
            <>
              <div className="modal__header">
                {posterUrl && (
                  <img src={posterUrl} alt="" className="modal__poster" />
                )}
                <div className="modal__header-info">
                  <span className="modal__badge">{typeBadge}</span>
                  <h2 className="modal__title">{display?.title}</h2>
                  <div className="modal__meta">
                    {year && <span>{year}</span>}
                    {rating && <span className="modal__rating">{rating}</span>}
                    {display?.source && <span className="modal__source">{display.source}</span>}
                  </div>
                  {genres.length > 0 && (
                    <div className="modal__genres">
                      {genres.map((g) => (
                        <span key={g} className="modal__genre">{g}</span>
                      ))}
                    </div>
                  )}
                  <button className="btn btn--play" disabled title="Playback coming in Phase 3">
                    <span className="btn__icon">▶</span> Play
                  </button>
                  <p className="modal__play-note">Playback not yet available — Phase 3</p>
                </div>
              </div>

              {overview && (
                <div className="modal__overview">
                  <h3>Overview</h3>
                  <p>{overview}</p>
                </div>
              )}

              {display?.type === 'series' && (
                <div className="modal__episodes">
                  <h3>Episodes</h3>
                  {seasons.length > 1 && (
                    <select
                      className="modal__season-select"
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(Number(e.target.value))}
                      aria-label="Select season"
                    >
                      {seasons.map((s) => (
                        <option key={s.season} value={s.season}>
                          Season {s.season} ({s.episodes} episodes)
                        </option>
                      ))}
                    </select>
                  )}
                  {episodesLoading ? (
                    <div className="modal__episodes-loading">
                      <div className="spinner spinner--small" />
                      <span>Loading episodes...</span>
                    </div>
                  ) : episodes.length > 0 ? (
                    <div className="modal__episode-list">
                      {episodes.map((ep) => (
                        <div key={ep.id} className="modal__episode">
                          <div className="modal__episode-number">{ep.providerData?.episode || '?'}</div>
                          <div className="modal__episode-info">
                            <h4>{ep.title}</h4>
                            {ep.overview && <p>{ep.overview.slice(0, 150)}{ep.overview.length > 150 ? '...' : ''}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="modal__episodes-empty">Episode details not available for this title.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailModal;