'use strict';

const {
  createSession,
  getSession,
  deleteSession,
  joinSession,
  removePlayer,
  gameStateSnapshot,
} = require('../../server/session');

describe('Session management', () => {
  let session;

  beforeEach(() => {
    session = createSession();
  });

  afterEach(() => {
    deleteSession(session.code);
  });

  test('createSession returns a session with a unique code', () => {
    expect(session).toBeDefined();
    expect(session.code).toMatch(/^[A-Z]{4}-[0-9]{4}$/);
  });

  test('createSession generates unique codes for different sessions', () => {
    const session2 = createSession();
    expect(session.code).not.toBe(session2.code);
    deleteSession(session2.code);
  });

  test('getSession returns the created session', () => {
    const found = getSession(session.code);
    expect(found).toBe(session);
  });

  test('getSession returns null for unknown code', () => {
    expect(getSession('ZZZZ-9999')).toBeNull();
  });

  test('deleteSession removes the session', () => {
    deleteSession(session.code);
    expect(getSession(session.code)).toBeNull();
    // prevent double-delete in afterEach
    session = createSession();
  });
});

describe('joinSession', () => {
  let session;

  beforeEach(() => {
    session = createSession();
  });

  afterEach(() => {
    deleteSession(session.code);
  });

  function mockWs() {
    return { readyState: 1, send: jest.fn() };
  }

  test('joins a valid role successfully', () => {
    const ws = mockWs();
    const result = joinSession(session, 'captain', ws);
    expect(result.ok).toBe(true);
    expect(session.players.captain).toBe(ws);
  });

  test('rejects unknown roles', () => {
    const result = joinSession(session, 'janitor', mockWs());
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/Unknown role/);
  });

  test('rejects duplicate role assignment', () => {
    joinSession(session, 'helm', mockWs());
    const result = joinSession(session, 'helm', mockWs());
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/already taken/);
  });

  test('allows different roles from different players', () => {
    expect(joinSession(session, 'captain', mockWs()).ok).toBe(true);
    expect(joinSession(session, 'helm', mockWs()).ok).toBe(true);
    expect(joinSession(session, 'engineering', mockWs()).ok).toBe(true);
  });
});

describe('removePlayer', () => {
  let session;

  beforeEach(() => {
    session = createSession();
  });

  afterEach(() => {
    deleteSession(session.code);
  });

  test('removes a connected player and returns their role', () => {
    const ws = { readyState: 1, send: jest.fn() };
    joinSession(session, 'helm', ws);
    const role = removePlayer(session, ws);
    expect(role).toBe('helm');
    expect(session.players.helm).toBeUndefined();
  });

  test('returns null when websocket is not a player', () => {
    const role = removePlayer(session, { readyState: 1 });
    expect(role).toBeNull();
  });
});

describe('gameStateSnapshot', () => {
  let session;

  beforeEach(() => {
    session = createSession();
  });

  afterEach(() => {
    deleteSession(session.code);
  });

  test('snapshot has required fields', () => {
    const snap = gameStateSnapshot(session);
    expect(snap.type).toBe('game_state');
    expect(snap.ship).toBeDefined();
    expect(snap.energy).toBeDefined();
    expect(snap.systems).toBeDefined();
    expect(snap.mission).toBeDefined();
    expect(snap.connectedRoles).toBeInstanceOf(Array);
  });

  test('connectedRoles reflects current players', () => {
    const ws = { readyState: 1, send: jest.fn() };
    joinSession(session, 'captain', ws);
    const snap = gameStateSnapshot(session);
    expect(snap.connectedRoles).toContain('captain');
  });
});
