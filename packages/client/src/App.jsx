import { useState, useEffect } from 'react';

function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setHealth(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    checkHealth();
  }, []);

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

      <section style={styles.status} aria-live="polite">
        {error ? (
          <div style={styles.error}>
            <strong>Backend unreachable:</strong> {error}
            <p style={styles.hint}>Start the backend with <code>npm run dev</code> from the project root.</p>
          </div>
        ) : (
          <div style={styles.ok}>
            <strong>Backend healthy:</strong> {JSON.stringify(health, null, 2)}
          </div>
        )}
      </section>

      <footer style={styles.footer}>
        <p>Phase 0 - Foundation verified</p>
      </footer>
    </main>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    textAlign: 'center',
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
  },
  status: {
    width: '100%',
    maxWidth: '700px',
    padding: '1.5rem',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  ok: {
    color: '#4ade80',
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
  },
  error: {
    color: '#f87171',
    textAlign: 'left',
  },
  hint: {
    marginTop: '0.75rem',
    fontSize: '0.875rem',
    color: '#999',
  },
  footer: {
    marginTop: '2rem',
    color: '#666',
    fontSize: '0.875rem',
  },
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default App;