function Hero({ item, onPlay, onInfo }) {
  if (!item) return null;

  const backdropUrl = item.backdrop || item.poster;
  const year = item.year || '';
  const rating = item.rating ? `★ ${item.rating.toFixed(1)}` : '';
  const genres = item.genres?.slice(0, 3).join(' • ') || '';

  return (
    <section className="hero" style={backdropUrl ? { backgroundImage: `url(${backdropUrl})` } : undefined}>
      <div className="hero__gradient" />
      <div className="hero__content">
        <span className="hero__badge">{item.type === 'series' ? 'Series' : 'Movie'}</span>
        <h1 className="hero__title">{item.title}</h1>
        <div className="hero__meta">
          {year && <span>{year}</span>}
          {rating && <span className="hero__rating">{rating}</span>}
          {genres && <span>{genres}</span>}
        </div>
        {item.overview && (
          <p className="hero__overview">{item.overview.slice(0, 200)}{item.overview.length > 200 ? '...' : ''}</p>
        )}
        <div className="hero__actions">
          <button className="hero__btn hero__btn--play" onClick={() => onPlay(item)}>
            <span className="hero__btn-icon">▶</span> Play
          </button>
          <button className="hero__btn hero__btn--info" onClick={() => onInfo(item)}>
            <span className="hero__btn-icon">ℹ</span> More Info
          </button>
        </div>
      </div>
    </section>
  );
}

export default Hero;