import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from './index.js';

const PORT = 3002;
let server;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('GET /api/health', () => {
  it('returns 200 with JSON health payload', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/health`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.status, 'ok');
    assert.ok(data.timestamp);
    assert.ok(typeof data.uptime === 'number');
    assert.equal(data.version, '0.0.0');
  });

  it('returns JSON content type', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/health`);
    const contentType = response.headers.get('content-type');
    assert.ok(contentType?.includes('application/json'));
  });
});

describe('GET /api/home/trending', () => {
  it('returns 200 with titles array', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/home/trending`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(Array.isArray(data.titles));
    assert.ok(data.provider);
    assert.ok(data.timestamp);
  });

  it('returns valid title objects when titles exist', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/home/trending`);
    const data = await response.json();
    if (data.titles.length > 0) {
      const title = data.titles[0];
      assert.ok(title.id);
      assert.ok(title.title);
      assert.ok(['movie', 'series'].includes(title.type));
      assert.ok(title.source);
    }
  });
});

describe('GET /api/home/latest', () => {
  it('returns 200 with titles array', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/home/latest`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(Array.isArray(data.titles));
    assert.ok(data.provider);
    assert.ok(data.timestamp);
  });
});

describe('GET /api/home/popular-series', () => {
  it('returns 200 with titles array', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/home/popular-series`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(Array.isArray(data.titles));
    assert.ok(data.provider);
    assert.ok(data.timestamp);
  });

  it('returns only series type titles', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/home/popular-series`);
    const data = await response.json();
    data.titles.forEach(title => {
      assert.equal(title.type, 'series');
    });
  });
});

describe('GET /api/search', () => {
  it('returns 400 for missing query', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/search`);
    assert.equal(response.status, 400);
    const data = await response.json();
    assert.ok(data.error);
  });

  it('returns 400 for short query', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/search?q=a`);
    assert.equal(response.status, 400);
    const data = await response.json();
    assert.ok(data.error);
  });

  it('returns 200 with search results for valid query', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/search?q=batman`);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(Array.isArray(data.titles));
    assert.equal(data.query, 'batman');
    assert.ok(data.provider);
    assert.ok(typeof data.hasMore === 'boolean');
    assert.ok(data.timestamp);
  });
});

describe('404 handling', () => {
  it('returns 404 for unknown routes', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/unknown`);
    assert.equal(response.status, 404);
    const data = await response.json();
    assert.equal(data.error, 'Not found');
  });
});