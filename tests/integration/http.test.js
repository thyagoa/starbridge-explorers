'use strict';

const http = require('http');
const { app, server: httpServer, wss } = require('../../server/index');
const { createSession, deleteSession } = require('../../server/session');

// ─── Helpers ───────────────────────────────────────────────────────────────

let testPort;
let baseUrl;

function httpRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(`${baseUrl}${path}`, { method }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({
        status: res.statusCode,
        body,
        json: () => JSON.parse(body),
      }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeAll((done) => {
  httpServer.listen(0, '127.0.0.1', () => {
    testPort = httpServer.address().port;
    baseUrl = `http://127.0.0.1:${testPort}`;
    done();
  });
});

afterAll((done) => {
  wss.clients.forEach((c) => c.terminate());
  wss.close(() => httpServer.close(done));
});

// ─── Station HTML routes ───────────────────────────────────────────────────

describe('GET /captain/:code', () => {
  test('serves the captain HTML page', async () => {
    const session = createSession();
    const res = await httpRequest(`/captain/${session.code}`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('<!DOCTYPE html>');
    deleteSession(session.code);
  });
});

describe('GET /helm/:code', () => {
  test('serves the helm HTML page', async () => {
    const session = createSession();
    const res = await httpRequest(`/helm/${session.code}`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('<!DOCTYPE html>');
    deleteSession(session.code);
  });
});

describe('GET /engineering/:code', () => {
  test('serves the engineering HTML page', async () => {
    const session = createSession();
    const res = await httpRequest(`/engineering/${session.code}`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('<!DOCTYPE html>');
    deleteSession(session.code);
  });
});

describe('GET /viewscreen/:code', () => {
  test('serves the viewscreen HTML page', async () => {
    const session = createSession();
    const res = await httpRequest(`/viewscreen/${session.code}`);
    expect(res.status).toBe(200);
    expect(res.body).toContain('<!DOCTYPE html>');
    deleteSession(session.code);
  });
});

// ─── /api/sessions/:code/map ───────────────────────────────────────────────

describe('GET /api/sessions/:code/map', () => {
  test('returns systems and routes for a valid session code', async () => {
    const session = createSession();
    const res = await httpRequest(`/api/sessions/${session.code}/map`);
    expect(res.status).toBe(200);
    const data = res.json();
    expect(data.systems).toBeInstanceOf(Array);
    expect(data.routes).toBeInstanceOf(Array);
    expect(data.systems.length).toBeGreaterThan(0);
    expect(data.routes.length).toBeGreaterThan(0);
    // Each system should have id, name, px, py
    expect(data.systems[0]).toMatchObject({ id: expect.any(Number), name: expect.any(String), px: expect.any(Number), py: expect.any(Number) });
    deleteSession(session.code);
  });

  test('returns 404 for an unknown session code', async () => {
    const res = await httpRequest('/api/sessions/ZZZZ-0000/map');
    expect(res.status).toBe(404);
  });

  test('code lookup is case-insensitive (lowercase in URL)', async () => {
    const session = createSession();
    const lower = session.code.toLowerCase();
    const res = await httpRequest(`/api/sessions/${lower}/map`);
    expect(res.status).toBe(200);
    deleteSession(session.code);
  });
});

// ─── /api/qr ───────────────────────────────────────────────────────────────

describe('GET /api/qr', () => {
  test('returns a PNG data URL for a given url param', async () => {
    const res = await httpRequest('/api/qr?url=http://example.com');
    expect(res.status).toBe(200);
    const data = res.json();
    expect(data.dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  test('returns 400 when url param is missing', async () => {
    const res = await httpRequest('/api/qr');
    expect(res.status).toBe(400);
    const data = res.json();
    expect(data.error).toMatch(/url required/);
  });
});
