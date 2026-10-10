import { useRef } from 'react';
import TitleCard from './TitleCard';

function Row({ title, items, onCardClick, loading }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <section className="row">
        <h2 className="row__title">{title}</h2>
        <div className="row__scroll row__scroll--skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card" />
          ))}
        </div>
      </section>
    );
  }

  if (!items?.length) {
    return (
      <section className="row">
        <h2 className="row__title">{title}</h2>
        <p className="row__empty">No content available</p>
      </section>
    );
  }

  return (
    <section className="row">
      <h2 className="row__title">{title}</h2>
      <div className="row__container">
        <button className="row__arrow row__arrow--left" onClick={() => scroll('left')} aria-label="Scroll left">
          ‹
        </button>
        <div className="row__scroll" ref={scrollRef}>
          {items.map((item) => (
            <TitleCard key={item.id} item={item} onClick={onCardClick} />
          ))}
        </div>
        <button className="row__arrow row__arrow--right" onClick={() => scroll('right')} aria-label="Scroll right">
          ›
        </button>
      </div>
    </section>
  );
}

export default Row;