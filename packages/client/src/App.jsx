import { useEffect, useState } from "react";

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app">
      <h1 className="brand">STREAMIX</h1>
      <p>Phase 0 foundation. Development environment scaffold; no content or playback yet.</p>
      <div className="status">
        {health ? (
          <span className="ok">
            API healthy &middot; {health.name} &middot; {health.time}
          </span>
        ) : error ? (
          <span className="err">API unreachable: {error}</span>
        ) : (
          <span>Checking API...</span>
        )}
      </div>
    </main>
  );
}
