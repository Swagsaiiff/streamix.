import { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Row from './components/Row';
import DetailModal from './components/DetailModal';

function App() {
  const [trending, setTrending] = useState([]);
  const [latest, setLatest] = useState([]);
  const [popularSeries, setPopularSeries] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeView, setActiveView] = useState('home');

  const fetchSection = useCallback(async (endpoint, setter) => {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setter(data.titles || []);
    } catch (err) {
      console.error(`Fetch failed for ${endpoint}:`, err);
      setter([]);
    }
  }, []);

  const handleSearch = useCallback(async (query) => {
    setSearchLoading(true);
    setActiveView('search');
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
  }, []);

  useEffect(() => {
    async function init() {
      try {
        await fetch('/api/health');
      } catch {
        setError('Backend unreachable. Start with npm run dev.');
      }
      await Promise.all([
        fetchSection('/api/home/trending', setTrending),
        fetchSection('/api/home/latest', setLatest),
        fetchSection('/api/home/popular-series', setPopularSeries),
      ]);
      setLoading(false);
    }
    init();
  }, [fetchSection]);

  const heroItem = trending[0] || latest[0] || null;

  const handleCardClick = (item) => setSelectedItem(item);
  const handleCloseModal = () => setSelectedItem(null);

  const handleNavClick = (e) => {
    const href = e.target.getAttribute('href');
    if (href === '#home') { e.preventDefault(); setActiveView('home'); setSearchQuery(''); setSearchResults([]); }
    else if (href === '#movies') { e.preventDefault(); setActiveView('movies'); }
    else if (href === '#series') { e.preventDefault(); setActiveView('series'); }
  };

  useEffect(() => {
    const nav = document.querySelector('.navbar__links');
    if (!nav) return;
    nav.addEventListener('click', handleNavClick);
    return () => nav.removeEventListener('click', handleNavClick);
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <span className="app-loading__text">STREAMIX</span>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar
        onSearch={handleSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchLoading={searchLoading}
      />

      {error && (
        <div className="app-error">
          <strong>Backend unreachable:</strong> {error}
        </div>
      )}

      {activeView === 'search' ? (
        <main className="search-view">
          <h2 className="search-view__title">
            {searchLoading ? 'Searching...' : `Results for "${searchQuery}"`}
          </h2>
          {!searchLoading && searchResults.length === 0 && (
            <p className="search-view__empty">No results found.</p>
          )}
          <div className="search-view__grid">
            {searchResults.map((item) => (
              <article
                key={item.id}
                className="search-card"
                onClick={() => handleCardClick(item)}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCardClick(item); }}
                role="button"
              >
                {item.poster ? (
                  <img src={item.poster} alt="" className="search-card__poster" loading="lazy" />
                ) : (
                  <div className="search-card__placeholder">{item.type === 'series' ? 'Series' : 'Movie'}</div>
                )}
                <div className="search-card__info">
                  <h3>{item.title}</h3>
                  <div className="search-card__meta">
                    {item.year && <span>{item.year}</span>}
                    {item.rating && <span className="search-card__rating">★ {item.rating.toFixed(1)}</span>}
                    <span className="search-card__type">{item.type === 'series' ? 'Series' : 'Movie'}</span>
                  </div>
                  {item.overview && <p>{item.overview.slice(0, 100)}...</p>}
                </div>
              </article>
            ))}
          </div>
        </main>
      ) : (
        <main>
          <Hero item={heroItem} onPlay={handleCardClick} onInfo={handleCardClick} />

          <div className="rows">
            {(activeView === 'home' || activeView === 'movies') && (
              <>
                <Row title="Trending Now" items={trending} onCardClick={handleCardClick} />
                <Row title="Latest Movies & Series" items={latest} onCardClick={handleCardClick} />
              </>
            )}
            {(activeView === 'home' || activeView === 'series') && (
              <Row title="Popular Series" items={popularSeries} onCardClick={handleCardClick} />
            )}
          </div>
        </main>
      )}

      {selectedItem && (
        <DetailModal item={selectedItem} onClose={handleCloseModal} />
      )}
    </div>
  );
}

export default App;