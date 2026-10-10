import TitleCard from "./TitleCard.jsx";

export default function Row({ title, items, meta, onSelect }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="row">
      <div className="row-header">
        <h2>{title}</h2>
        {meta && <span className="row-meta">{meta}</span>}
      </div>
      <div className="row-scroll">
        {items.map((item) => (
          <TitleCard key={item.id} item={item} onClick={onSelect} />
        ))}
      </div>
    </section>
  );
}
