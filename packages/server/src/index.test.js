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

describe('404 handling', () => {
  it('returns 404 for unknown routes', async () => {
    const response = await fetch(`http://localhost:${PORT}/api/unknown`);
    assert.equal(response.status, 404);
    const data = await response.json();
    assert.equal(data.error, 'Not found');
  });
});