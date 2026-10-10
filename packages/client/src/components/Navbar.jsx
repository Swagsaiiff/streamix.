import { useState, useRef, useEffect } from 'react';

function Navbar({ onSearch, searchQuery, setSearchQuery, searchLoading }) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus();
  }, [searchOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query.length >= 2) onSearch(query);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__inner">
        <a href="/" className="navbar__logo" aria-label="STREAMIX Home">
          STREAMIX
        </a>

        <ul className="navbar__links">
          <li><a href="#home" className="navbar__link navbar__link--active">Home</a></li>
          <li><a href="#movies" className="navbar__link">Movies</a></li>
          <li><a href="#series" className="navbar__link">Series</a></li>
        </ul>

        <div className="navbar__actions">
          {searchOpen ? (
            <form className="navbar__search-form" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Titles, people, genres..."
                className="navbar__search-input"
                autoComplete="off"
                disabled={searchLoading}
                aria-label="Search"
              />
              <button type="submit" className="navbar__search-submit" disabled={searchLoading || searchQuery.length < 2}>
                {searchLoading ? '...' : 'Search'}
              </button>
              <button type="button" className="navbar__search-close" onClick={() => { setSearchOpen(false); setSearchQuery(''); }} aria-label="Close search">
                ✕
              </button>
            </form>
          ) : (
            <button className="navbar__search-toggle" onClick={() => setSearchOpen(true)} aria-label="Open search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;