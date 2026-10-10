function TitleCard({ item, onClick }) {
  const posterUrl = item.poster;
  const year = item.year ? ` (${item.year})` : '';
  const rating = item.rating ? item.rating.toFixed(1) : null;
  const typeBadge = item.type === 'series' ? 'Series' : 'Movie';

  return (
    <article
      className="title-card"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(item); } }}
      role="button"
      aria-label={`${item.title}${year}`}
    >
      <div className="title-card__poster">
        {posterUrl ? (
          <img src={posterUrl} alt="" loading="lazy" />
        ) : (
          <div className="title-card__placeholder">
            <span>{typeBadge}</span>
          </div>
        )}
        <div className="title-card__overlay">
          <div className="title-card__overlay-content">
            <span className="title-card__play-icon">▶</span>
            <div className="title-card__meta">
              {rating && <span className="title-card__rating">★ {rating}</span>}
              <span className="title-card__type">{typeBadge}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="title-card__info">
        <h3 className="title-card__title">{item.title}</h3>
        {item.year && <span className="title-card__year">{item.year}</span>}
      </div>
    </article>
  );
}

export default TitleCard;