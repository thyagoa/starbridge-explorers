'use strict';

const http = require('http');
const { WebSocket } = require('ws');
const { app, server: httpServer, wss } = require('../../server/index');
const { createSession, deleteSession, getSession } = require('../../server/session');

// ─── Helpers ───────────────────────────────────────────────────────────────

let testPort;
let baseUrl;
let wsUrl;

function wsConnect(role, code) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${wsUrl}/ws/${role}/${code}`);
    // Buffer messages that arrive before nextMessage() is called.
    // In Node.js 24 the server may send role_assigned before the client
    // fires 'open', so we must not miss messages by registering the
    // listener early.
    ws._msgQueue   = [];
    ws._msgWaiters = [];
    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      if (ws._msgWaiters.length) {
        ws._msgWaiters.shift()(msg);
      } else {
        ws._msgQueue.push(msg);
      }
    });
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function nextMessage(ws) {
  return new Promise((resolve, reject) => {
    if (ws._msgQueue && ws._msgQueue.length) {
      return resolve(ws._msgQueue.shift());
    }
    if (ws._msgWaiters) {
      ws._msgWaiters.push(resolve);
    } else {
      // Fallback for ws objects not created via wsConnect (e.g. inline ws2)
      ws.once('message', (data) => {
        try { resolve(JSON.parse(data.toString())); }
        catch (e) { reject(e); }
      });
      ws.once('error', reject);
    }
  });
}

function closeWs(ws) {
  if (!ws) return Promise.resolve();
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.CLOSED) return resolve();
    ws.once('close', resolve);
    ws.close();
  });
}

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeAll((done) => {
  httpServer.listen(0, '127.0.0.1', () => {
    testPort = httpServer.address().port;
    baseUrl = `http://127.0.0.1:${testPort}`;
    wsUrl = `ws://127.0.0.1:${testPort}`;
    done();
  });
});

afterAll((done) => {
  // Terminate any lingering connections so wss.close() callback fires promptly.
  wss.clients.forEach((client) => client.terminate());
  wss.close(() => httpServer.close(done));
});

// ─── REST endpoints ────────────────────────────────────────────────────────

describe('POST /api/sessions', () => {
  test('creates a session and returns a code', (done) => {
    http.request(`${baseUrl}/api/sessions`, { method: 'POST' }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        const json = JSON.parse(body);
        expect(json.code).toMatch(/^[A-Z]{4}-[0-9]{4}$/);
        deleteSession(json.code);
        done();
      });
    }).end();
  });
});

// ─── WebSocket flows ───────────────────────────────────────────────────────

describe('WebSocket: join_session → role_assigned', () => {
  let session;
  let ws;

  beforeEach(() => {
    session = createSession();
  });

  afterEach(async () => {
    if (ws) await closeWs(ws);
    deleteSession(session.code);
  });

  test('player receives role_assigned after connecting', async () => {
    ws = await wsConnect('captain', session.code);
    const msg = await nextMessage(ws);
    expect(msg.type).toBe('role_assigned');
    expect(msg.role).toBe('captain');
    expect(msg.code).toBe(session.code);
  });

  test('role_assigned includes map data', async () => {
    ws = await wsConnect('helm', session.code);
    const msg = await nextMessage(ws);
    expect(msg.mapData).toBeDefined();
    expect(msg.mapData.systems).toBeInstanceOf(Array);
    expect(msg.mapData.routes).toBeInstanceOf(Array);
  });

  test('connecting to unknown code closes with error', (done) => {
    const ws = new WebSocket(`${wsUrl}/ws/helm/ZZZZ-0000`);
    ws.once('message', (data) => {
      const msg = JSON.parse(data.toString());
      expect(msg.type).toBe('error');
      ws.close();
      done();
    });
  });

  test('duplicate role is rejected', async () => {
    ws = await wsConnect('helm', session.code);
    await nextMessage(ws); // consume role_assigned

    const ws2 = new WebSocket(`${wsUrl}/ws/helm/${session.code}`);
    const errorMsg = await new Promise((resolve) => {
      ws2.once('message', (data) => resolve(JSON.parse(data.toString())));
    });
    expect(errorMsg.type).toBe('error');
    expect(errorMsg.reason).toMatch(/already taken/);
    await closeWs(ws2);
  });
});

describe('WebSocket: mission_start', () => {
  let session;
  let captainWs;

  beforeEach(async () => {
    session = createSession();
    captainWs = await wsConnect('captain', session.code);
    await nextMessage(captainWs); // consume role_assigned
  });

  afterEach(async () => {
    await closeWs(captainWs);
    deleteSession(session.code);
  });

  test('captain can start the mission', async () => {
    captainWs.send(JSON.stringify({ type: 'mission_start' }));
    const msg = await nextMessage(captainWs);
    expect(msg.type).toBe('game_state');
    expect(msg.mission.status).toBe('active');
  });

  test('non-captain cannot start the mission', async () => {
    const helmWs = await wsConnect('helm', session.code);
    await nextMessage(helmWs); // consume role_assigned
    helmWs.send(JSON.stringify({ type: 'mission_start' }));
    // No state change expected — session stays in briefing
    await new Promise((r) => setTimeout(r, 100));
    expect(getSession(session.code).mission.status).toBe('briefing');
    await closeWs(helmWs);
  });
});

describe('WebSocket: energy_update', () => {
  let session;
  let engWs;
  let captainWs;

  beforeEach(async () => {
    session = createSession();
    captainWs = await wsConnect('captain', session.code);
    await nextMessage(captainWs);
    engWs = await wsConnect('engineering', session.code);
    await nextMessage(engWs); // consume role_assigned (also triggers players_update to captain)
    await nextMessage(captainWs); // consume players_update broadcast
  });

  afterEach(async () => {
    await closeWs(engWs);
    await closeWs(captainWs);
    deleteSession(session.code);
  });

  test('energy_update from engineering broadcasts game_state to all', async () => {
    const newAllocation = { propulsion: 60, shields: 15, lifeSupport: 15, sensors: 5, navComputer: 5 };
    engWs.send(JSON.stringify({ type: 'energy_update', allocation: newAllocation }));

    const captainMsg = await nextMessage(captainWs);
    expect(captainMsg.type).toBe('game_state');
    // Sum should still be 100
    const sum = Object.values(captainMsg.energy.allocation).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });
});

describe('WebSocket: helm_input', () => {
  let session;
  let helmWs;

  beforeEach(async () => {
    session = createSession();
    helmWs = await wsConnect('helm', session.code);
    await nextMessage(helmWs);
  });

  afterEach(async () => {
    await closeWs(helmWs);
    deleteSession(session.code);
  });

  test('helm_input updates heading and velocity on the session', async () => {
    helmWs.send(JSON.stringify({ type: 'helm_input', heading: 90, velocity: 0.8 }));
    await new Promise((r) => setTimeout(r, 50));
    expect(getSession(session.code).ship.heading).toBe(90);
    expect(getSession(session.code).ship.velocity).toBe(0.8);
  });

  test('velocity is clamped to [-0.5, 1]', async () => {
    helmWs.send(JSON.stringify({ type: 'helm_input', velocity: 5 }));
    await new Promise((r) => setTimeout(r, 50));
    expect(getSession(session.code).ship.velocity).toBe(1);
  });
});

describe('WebSocket: send_to_viewscreen', () => {
  let session;
  let helmWs;
  let viewscreenWs;

  beforeEach(async () => {
    session = createSession();
    helmWs = await wsConnect('helm', session.code);
    await nextMessage(helmWs);
    viewscreenWs = await wsConnect('viewscreen', session.code);
    await nextMessage(viewscreenWs); // consume role_assigned
    // Consume players_update broadcast on helm
    await nextMessage(helmWs);
  });

  afterEach(async () => {
    await closeWs(helmWs);
    await closeWs(viewscreenWs);
    deleteSession(session.code);
  });

  test('send_to_viewscreen delivers payload to viewscreen only', async () => {
    const payload = { view: 'map', zoom: 1.5 };
    helmWs.send(JSON.stringify({ type: 'send_to_viewscreen', payload }));

    const vsMsg = await nextMessage(viewscreenWs);
    expect(vsMsg.type).toBe('viewscreen_update');
    expect(vsMsg.from).toBe('helm');
    expect(vsMsg.payload).toEqual(payload);
  });
});
