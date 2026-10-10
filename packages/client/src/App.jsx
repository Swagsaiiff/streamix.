import { useState, useEffect, useCallback } from 'react';

function App() {
  const [health, setHealth] = useState(null);
  const [trending, setTrending] = useState([]);
  const [latest, setLatest] = useState([]);
  const [popularSeries, setPopularSeries] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  const fetchTrending = useCallback(async () => {
    try {
      const res = await fetch('/api/home/trending');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTrending(data.titles || []);
    } catch (err) {
      console.error('Trending fetch failed:', err);
    }
  }, []);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch('/api/home/latest');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLatest(data.titles || []);
    } catch (err) {
      console.error('Latest fetch failed:', err);
    }
  }, []);

  const fetchPopularSeries = useCallback(async () => {
    try {
      const res = await fetch('/api/home/popular-series');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPopularSeries(data.titles || []);
    } catch (err) {
      console.error('Popular series fetch failed:', err);
    }
  }, []);

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query.length < 2) return;

    setSearchLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSearchResults(data.titles || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    async function init() {
      await fetchHealth();
      await Promise.all([fetchTrending(), fetchLatest(), fetchPopularSeries()]);
      setLoading(false);
    }
    init();
  }, [fetchHealth, fetchTrending, fetchLatest, fetchPopularSeries]);

  if (loading) {
    return (
      <main style={styles.loading}>
        <div style={styles.spinner} role="status" aria-label="Loading">
          <span style={styles.spinnerText}>STREAMIX</span>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>STREAMIX</h1>
        <p style={styles.subtitle}>Netflix-style streaming from real CloudStream providers</p>
      </header>

      {error && (
        <div style={styles.bannerError}>
          <strong>Backend unreachable:</strong> {error}
          <p style={styles.hint}>Start the backend with <code>npm run dev</code> from the project root.</p>
        </div>
      )}

      <section style={styles.searchSection} aria-label="Search">
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <label htmlFor="search-input" style={styles.searchLabel}>Search</label>
          <input
            id="search-input"
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search movies and series..."
            style={styles.searchInput}
            autoComplete="off"
            disabled={searchLoading}
          />
          <button type="submit" style={styles.searchButton} disabled={searchLoading || searchQuery.length < 2}>
            {searchLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {searchResults.length > 0 && (
          <div style={styles.searchResults}>
            <h2 style={styles.sectionTitle}>Search Results for "{searchQuery}"</h2>
            <div style={styles.grid}>
              {searchResults.map(item => (
                <TitleCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}
        {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
          <p style={styles.emptyState}>No results found for "{searchQuery}"</p>
        )}
      </section>

      <section style={styles.contentSection} aria-label="Trending">
        <h2 style={styles.sectionTitle}>Trending Now</h2>
        {trending.length === 0 ? (
          <p style={styles.emptyState}>No trending content available</p>
        ) : (
          <div style={styles.grid}>
            {trending.slice(0, 10).map(item => (
              <TitleCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section style={styles.contentSection} aria-label="Latest">
        <h2 style={styles.sectionTitle}>Latest Movies & Series</h2>
        {latest.length === 0 ? (
          <p style={styles.emptyState}>No latest content available</p>
        ) : (
          <div style={styles.grid}>
            {latest.slice(0, 10).map(item => (
              <TitleCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section style={styles.contentSection} aria-label="Popular Series">
        <h2 style={styles.sectionTitle}>Popular Series</h2>
        {popularSeries.length === 0 ? (
          <p style={styles.emptyState}>No series available</p>
        ) : (
          <div style={styles.grid}>
            {popularSeries.slice(0, 10).map(item => (
              <TitleCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <footer style={styles.footer}>
        <p>Phase 1 - Dynamic Content Engine | Provider: CineStream (Stremio Catalogs)</p>
        <p style={styles.footerNote}>
          {health && `Backend: ${health.version} • ${health.environment}`}
        </p>
      </footer>
    </main>
  );
}

function TitleCard({ item }) {
  const posterUrl = item.poster;
  const year = item.year ? ` (${item.year})` : '';
  const rating = item.rating ? `★ ${item.rating.toFixed(1)}` : '';
  const typeBadge = item.type === 'series' ? 'Series' : 'Movie';

  return (
    <article style={styles.card} tabIndex={0}>
      {posterUrl && (
        <img
          src={posterUrl}
          alt={`${item.title}${year}`}
          style={styles.poster}
          loading="lazy"
        />
      )}
      {!posterUrl && (
        <div style={styles.posterPlaceholder}>
          <span>{typeBadge}</span>
        </div>
      )}
      <div style={styles.cardInfo}>
        <h3 style={styles.cardTitle}>{item.title}{year}</h3>
        <div style={styles.cardMeta}>
          <span style={styles.badge}>{typeBadge}</span>
          {item.genres?.length && (
            <span style={styles.badge}>{item.genres.slice(0, 2).join(', ')}</span>
          )}
          {rating && <span style={styles.rating}>{rating}</span>}
          <span style={styles.sourceBadge}>{item.source}</span>
        </div>
        {item.overview && (
          <p style={styles.cardOverview}>{item.overview.slice(0, 120)}...</p>
        )}
      </div>
    </article>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0d0d0d',
    color: '#f5f5f5',
    padding: '2rem 1rem',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '120px',
    height: '120px',
    border: '4px solid #333',
    borderTopColor: '#e50914',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerText: {
    fontWeight: 700,
    fontSize: '0.875rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: 'clamp(2rem, 5vw, 4rem)',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: '#e50914',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
    color: '#999',
    maxWidth: '600px',
    margin: '0 auto',
  },
  bannerError: {
    color: '#f87171',
    textAlign: 'center',
    padding: '1rem',
    marginBottom: '1.5rem',
    borderRadius: '8px',
    background: 'rgba(248, 113, 113, 0.1)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
  },
  hint: {
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: '#999',
  },
  searchSection: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto 2rem',
  },
  searchForm: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  searchLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#ccc',
    marginBottom: '0.25rem',
    display: 'block',
  },
  searchInput: {
    flex: 1,
    minWidth: '250px',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    borderRadius: '8px',
    border: '1px solid #333',
    backgroundColor: '#1a1a1a',
    color: '#f5f5f5',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  searchButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: '8px',
    backgroundColor: '#e50914',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  searchResults: {
    marginTop: '1.5rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '1rem',
    color: '#fff',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '1rem',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #333',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  poster: {
    width: '100%',
    aspectRatio: '2/3',
    objectFit: 'cover',
  },
  posterPlaceholder: {
    width: '100%',
    aspectRatio: '2/3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    color: '#666',
    fontSize: '0.875rem',
  },
  cardInfo: {
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  cardTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    lineHeight: 1.3,
    margin: 0,
    color: '#fff',
  },
  cardMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
    alignItems: 'center',
  },
  badge: {
    fontSize: '0.6875rem',
    fontWeight: 500,
    padding: '0.125rem 0.5rem',
    borderRadius: '4px',
    backgroundColor: '#333',
    color: '#ccc',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  rating: {
    fontSize: '0.75rem',
    color: '#f5c518',
  },
  sourceBadge: {
    fontSize: '0.6875rem',
    padding: '0.125rem 0.5rem',
    borderRadius: '4px',
    backgroundColor: '#e50914',
    color: '#fff',
    textTransform: 'capitalize',
  },
  cardOverview: {
    fontSize: '0.75rem',
    color: '#999',
    lineHeight: 1.4,
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  emptyState: {
    textAlign: 'center',
    color: '#666',
    padding: '2rem',
    gridColumn: '1 / -1',
  },
  contentSection: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto 2.5rem',
  },
  footer: {
    textAlign: 'center',
    color: '#666',
    fontSize: '0.875rem',
    marginTop: '2rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #222',
  },
  footerNote: {
    marginTop: '0.25rem',
    fontSize: '0.75rem',
    color: '#888',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  input[type="search"]::-webkit-search-cancel-button {
    -webkit-appearance: none;
    height: 16px;
    width: 16px;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23999' viewBox='0 0 24 24'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E") center/contain no-repeat;
    cursor: pointer;
  }
  input[type="search"]::-webkit-search-cancel-button:hover {
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23fff' viewBox='0 0 24 24'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E") center/contain no-repeat;
  }
`;
document.head.appendChild(styleSheet);

export default App;