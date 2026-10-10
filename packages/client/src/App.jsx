import { useEffect, useState, useCallback } from "react";
import { fetchHomeSections, fetchSearch } from "./api.js";
import Row from "./components/Row.jsx";
import SearchBox from "./components/SearchBox.jsx";

export default function App() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchState, setSearchState] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchHomeSections().then((results) => {
      if (cancelled) return;
      const ok = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      const failed = results
        .filter((r) => r.status === "rejected")
        .map((r) => r.reason.message);
      setSections(ok);
      setErrors(failed);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setSearchQuery(trimmed);
    setSearchState("loading");
    try {
      const result = await fetchSearch(trimmed);
      setSearchResult(result);
      setSearchState("done");
    } catch {
      setSearchState("error");
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResult(null);
    setSearchState("idle");
  }, []);

  return (
    <main className="app">
      <header className="topbar">
        <h1 className="brand">STREAMIX</h1>
        <SearchBox onSearch={handleSearch} disabled={searchState === "loading"} />
      </header>

      {searchState !== "idle" ? (
        <section className="search-results">
          <div className="row-header">
            <h2>Results for &quot;{searchQuery}&quot;</h2>
            <button className="link-btn" onClick={clearSearch}>
              Clear
            </button>
          </div>
          {searchState === "loading" && <p className="muted">Searching...</p>}
          {searchState === "error" && (
            <p className="err">Search failed. The provider may be unreachable.</p>
          )}
          {searchState === "done" &&
            (searchResult && searchResult.count === 0 ? (
              <p className="muted">No results found.</p>
            ) : (
              <Row items={searchResult?.items ?? []} />
            ))}
        </section>
      ) : (
        <>
          {loading && <p className="muted">Loading rows from the CineStream provider...</p>}
          {errors.length > 0 && (
            <p className="err">Some sections failed to load: {errors.join("; ")}</p>
          )}
          {!loading && sections.length === 0 && (
            <p className="muted">No sections loaded. Check that the server is running.</p>
          )}
          {sections.map(({ key, data }) => (
            <Row key={key} title={data.title} items={data.items} meta={data.ranking} />
          ))}
        </>
      )}
    </main>
  );
}
