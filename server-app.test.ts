import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApiApp } from './server-app.ts';

describe('Express API routes & security validation', () => {
  let server: http.Server;
  let baseUrl = '';

  before(async () => {
    const app = createApiApp();
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('GET /api/health returns ok status and security headers without x-powered-by', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-powered-by'), null);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.equal(data.service, 'lofty-air-lab');
  });

  it('GET /api/maps-config returns configured boolean and apiKey string', async () => {
    const res = await fetch(`${baseUrl}/api/maps-config`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(typeof data.configured, 'boolean');
    assert.equal(typeof data.apiKey, 'string');
  });

  it('GET /api/city-search rejects queries shorter than 2 characters', async () => {
    const res = await fetch(`${baseUrl}/api/city-search?q=a`);
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(typeof data.error === 'string' && data.error.length > 0);
  });

  it('POST /api/open-meteo-air rejects out-of-range coordinates', async () => {
    const res = await fetch(`${baseUrl}/api/open-meteo-air`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 999, lng: 78.4 }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/geocode rejects empty body with 400', async () => {
    const res = await fetch(`${baseUrl}/api/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/alerts validates coordinates and stores bounded valid subscriptions', async () => {
    const bad = await fetch(`${baseUrl}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationLabel: 'A', lat: 200, lng: 78 }),
    });
    assert.equal(bad.status, 400);

    const good = await fetch(`${baseUrl}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locationLabel: 'Hyderabad Society',
        lat: 17.39,
        lng: 78.49,
        thresholdAqi: 151,
        channel: 'in_app',
      }),
    });
    assert.equal(good.status, 200);
    const body = await good.json();
    assert.equal(body.subscription.locationLabel, 'Hyderabad Society');
    assert.equal(body.subscription.thresholdAqi, 151);
  });

  it('POST /api/air-plan validates short location strings', async () => {
    const res = await fetch(`${baseUrl}/api/air-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: 'X' }),
    });
    assert.equal(res.status, 400);
  });

  it('POST /api/air-chat validates short questions and handles missing Gemini key cleanly', async () => {
    const shortRes = await fetch(`${baseUrl}/api/air-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'A' }),
    });
    assert.equal(shortRes.status, 400);

    const prevKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const noKeyRes = await fetch(`${baseUrl}/api/air-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'Is it safe to walk today?', location: 'Hyderabad' }),
      });
      assert.equal(noKeyRes.status, 503);
    } finally {
      if (prevKey !== undefined) process.env.GEMINI_API_KEY = prevKey;
    }
  });
});
