'use strict';

const {
  createSession,
  getSession,
  deleteSession,
  joinSession,
  removePlayer,
  gameStateSnapshot,
  handleMessage,
  startTick,
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

describe('handleMessage', () => {
  let session;

  beforeEach(() => { session = createSession(); });
  afterEach(() => { deleteSession(session.code); });

  test('returns false for unknown message type', () => {
    expect(handleMessage(session, 'captain', JSON.stringify({ type: 'unknown_xyz' }))).toBe(false);
  });

  test('returns false for malformed JSON', () => {
    expect(handleMessage(session, 'captain', 'not json at all')).toBe(false);
  });

  test('returns true for known message type', () => {
    // helm_input is always accepted regardless of mission status
    const result = handleMessage(session, 'helm', JSON.stringify({ type: 'helm_input', heading: 45, velocity: 0.5 }));
    expect(result).toBe(true);
    expect(session.ship.heading).toBe(45);
  });
});

describe('startTick', () => {
  let session;

  beforeEach(() => { session = createSession(); });
  afterEach(() => {
    if (session.tickInterval) clearInterval(session.tickInterval);
    deleteSession(session.code);
    jest.useRealTimers();
  });

  test('does not start a second interval if already running', () => {
    const spy = jest.spyOn(global, 'setInterval');
    startTick(session);
    startTick(session);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  test('broadcasts game_state on each tick when mission is active', () => {
    jest.useFakeTimers();
    const mockWs = { readyState: 1, send: jest.fn() };
    joinSession(session, 'captain', mockWs);
    session.mission.status = 'active';

    startTick(session);
    jest.advanceTimersByTime(2000);

    expect(mockWs.send).toHaveBeenCalled();
    const msg = JSON.parse(mockWs.send.mock.calls[0][0]);
    expect(msg.type).toBe('game_state');
  });

  test('does not broadcast when mission is not active', () => {
    jest.useFakeTimers();
    const mockWs = { readyState: 1, send: jest.fn() };
    joinSession(session, 'captain', mockWs);
    // status is 'briefing' by default

    startTick(session);
    jest.advanceTimersByTime(2000);

    expect(mockWs.send).not.toHaveBeenCalled();
  });

  test('clears itself when mission ends (hull = 0)', () => {
    jest.useFakeTimers();
    const mockWs = { readyState: 1, send: jest.fn() };
    joinSession(session, 'captain', mockWs);
    session.mission.status = 'active';
    session.ship.hull = 0;

    startTick(session);
    jest.advanceTimersByTime(2000);

    expect(session.tickInterval).toBeNull();
  });
});
