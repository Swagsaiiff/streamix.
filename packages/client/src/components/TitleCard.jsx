export default function TitleCard({ item }) {
  const poster = item.enriched?.poster ?? item.poster;
  return (
    <article className="card">
      <div className="card-poster">
        {poster ? (
          <img
            src={poster}
            alt={item.title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : (
          <span className="card-placeholder">{item.title}</span>
        )}
      </div>
      <h3 className="card-title">{item.title}</h3>
      <p className="card-meta">
        {item.type}
        {item.year ? ` · ${item.year}` : ""}
        {item.rating ? ` · ${item.rating}` : ""}
      </p>
    </article>
  );
}
