'use strict';

const { tickMission } = require('./mission1');

const ROLES = ['captain', 'helm', 'engineering', 'viewscreen'];
const TICK_INTERVAL_MS = 2000;

// ─── Default state factories ───────────────────────────────────────────────

function defaultEnergy() {
  return {
    total: 100,
    allocation: {
      propulsion: 40,
      shields: 20,
      lifeSupport: 20,
      sensors: 10,
      navComputer: 10,
    },
    overloads: {}, // systemKey → expiry timestamp (ms)
  };
}

function defaultSystems() {
  return {
    propulsion: 100,
    shields: 100,
    lifeSupport: 100,
    sensors: 100,
    navComputer: 100,
  };
}

function defaultShip() {
  return {
    name: "ORION'S WAKE",
    hull: 100,
    position: { x: 400, y: 300 },
    heading: 0,   // degrees, 0 = north (up)
    velocity: 0,  // 0..1 normalised
  };
}

// ─── Energy helpers ────────────────────────────────────────────────────────

/**
 * Normalise an allocation object so its values sum to exactly 100.
 * Clamps each value to [0, systemHealth] before normalising.
 */
function normaliseAllocation(allocation, systems) {
  const keys = Object.keys(allocation);
  let clamped = {};
  for (const k of keys) {
    clamped[k] = Math.max(0, Math.min(allocation[k], systems[k]));
  }
  const sum = keys.reduce((s, k) => s + clamped[k], 0);
  if (sum === 0) {
    // distribute evenly
    const each = 100 / keys.length;
    for (const k of keys) clamped[k] = each;
    return clamped;
  }
  const factor = 100 / sum;
  const result = {};
  let running = 0;
  keys.forEach((k, i) => {
    if (i < keys.length - 1) {
      result[k] = Math.round(clamped[k] * factor);
      running += result[k];
    } else {
      result[k] = 100 - running; // last absorbs rounding
    }
  });
  return result;
}

/**
 * Apply an overload to a system.
 * Returns updated energy state (does not mutate).
 */
function applyOverload(energy, systems, systemKey) {
  const now = Date.now();
  const alreadyActive = energy.overloads[systemKey] && energy.overloads[systemKey] > now;
  if (alreadyActive) return { energy, systems }; // ignore duplicate

  const OVERLOAD_DURATION_MS = 30_000;
  const OVERLOAD_DAMAGE = 10;

  const newOverloads = { ...energy.overloads, [systemKey]: now + OVERLOAD_DURATION_MS };
  const newSystems = { ...systems, [systemKey]: Math.max(0, systems[systemKey] - OVERLOAD_DAMAGE) };
  const newAllocation = normaliseAllocation(energy.allocation, newSystems);

  return {
    energy: { ...energy, allocation: newAllocation, overloads: newOverloads },
    systems: newSystems,
  };
}

/**
 * Expire finished overloads (pure, does not mutate).
 */
function expireOverloads(energy) {
  const now = Date.now();
  const active = {};
  for (const [k, exp] of Object.entries(energy.overloads)) {
    if (exp > now) active[k] = exp;
  }
  return { ...energy, overloads: active };
}

/**
 * Effective energy for a system, considering active overloads.
 */
function effectiveEnergy(energy, systemKey) {
  const base = energy.allocation[systemKey] ?? 0;
  const isOverloaded = energy.overloads[systemKey] && energy.overloads[systemKey] > Date.now();
  return isOverloaded ? Math.round(base * 1.3) : base;
}

// ─── Session management ────────────────────────────────────────────────────

const sessions = new Map(); // code → session

function generateCode() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '0123456789';
  let code;
  do {
    code =
      Array.from({ length: 4 }, () => letters[Math.floor(Math.random() * letters.length)]).join('') +
      '-' +
      Array.from({ length: 4 }, () => digits[Math.floor(Math.random() * digits.length)]).join('');
  } while (sessions.has(code));
  return code;
}

function createSession() {
  const code = generateCode();
  const session = {
    code,
    players: {},      // role → WebSocket
    ship: defaultShip(),
    energy: defaultEnergy(),
    systems: defaultSystems(),
    mission: {
      type: 1,
      status: 'briefing', // briefing | active | won | lost
      timer: 600,          // seconds remaining
      lifeSupportLowSince: null,
      target: { x: 1800, y: 900, velocity: 0.8, heading: 135 },
    },
    tickInterval: null,
  };
  sessions.set(code, session);
  return session;
}

function getSession(code) {
  return sessions.get(code) ?? null;
}

function deleteSession(code) {
  const session = sessions.get(code);
  if (session && session.tickInterval) clearInterval(session.tickInterval);
  sessions.delete(code);
}

// ─── Player joining ────────────────────────────────────────────────────────

/**
 * Attempt to add a player WebSocket to a session with the requested role.
 * Returns { ok: true } or { ok: false, reason: string }.
 */
function joinSession(session, role, ws) {
  if (!ROLES.includes(role)) return { ok: false, reason: `Unknown role: ${role}` };
  if (session.players[role]) return { ok: false, reason: `Role ${role} already taken` };
  session.players[role] = ws;
  return { ok: true };
}

function removePlayer(session, ws) {
  for (const [role, playerWs] of Object.entries(session.players)) {
    if (playerWs === ws) {
      delete session.players[role];
      return role;
    }
  }
  return null;
}

// ─── Broadcasting ──────────────────────────────────────────────────────────

function broadcast(session, message, exclude = null) {
  const data = JSON.stringify(message);
  for (const ws of Object.values(session.players)) {
    if (ws !== exclude && ws.readyState === 1 /* OPEN */) {
      ws.send(data);
    }
  }
}

function sendTo(session, role, message) {
  const ws = session.players[role];
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

// ─── Game state snapshot ───────────────────────────────────────────────────

function gameStateSnapshot(session) {
  return {
    type: 'game_state',
    ship: session.ship,
    energy: session.energy,
    systems: session.systems,
    mission: {
      type: session.mission.type,
      status: session.mission.status,
      timer: session.mission.timer,
      target: session.mission.target,
    },
    connectedRoles: Object.keys(session.players),
  };
}

// ─── Tick loop ─────────────────────────────────────────────────────────────

function startTick(session) {
  if (session.tickInterval) return;
  session.tickInterval = setInterval(() => {
    if (session.mission.status !== 'active') return;

    // Expire overloads
    session.energy = expireOverloads(session.energy);

    // Delegate movement + damage + win/loss to mission module
    tickMission(session, effectiveEnergy, TICK_INTERVAL_MS);

    // Broadcast updated state
    broadcast(session, gameStateSnapshot(session));

    // Stop ticking when mission ends
    if (session.mission.status === 'won' || session.mission.status === 'lost') {
      clearInterval(session.tickInterval);
      session.tickInterval = null;
    }
  }, TICK_INTERVAL_MS);
}

// ─── Message handlers ──────────────────────────────────────────────────────

/**
 * Handle an incoming WebSocket message from a player.
 * Returns true if the message was handled.
 */
function handleMessage(session, senderRole, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return false;
  }

  switch (msg.type) {
    case 'mission_start': {
      if (senderRole !== 'captain') break;
      if (session.mission.status !== 'briefing') break;
      session.mission.status = 'active';
      startTick(session);
      broadcast(session, gameStateSnapshot(session));
      break;
    }

    case 'energy_update': {
      if (senderRole !== 'engineering') break;
      const { allocation } = msg;
      if (!allocation) break;
      session.energy = {
        ...session.energy,
        allocation: normaliseAllocation(allocation, session.systems),
      };
      broadcast(session, gameStateSnapshot(session));
      break;
    }

    case 'overload': {
      if (senderRole !== 'engineering') break;
      const { system } = msg;
      if (!system) break;
      const { energy, systems } = applyOverload(session.energy, session.systems, system);
      session.energy = energy;
      session.systems = systems;
      broadcast(session, gameStateSnapshot(session));
      break;
    }

    case 'helm_input': {
      if (senderRole !== 'helm') break;
      const { velocity, heading } = msg;
      if (velocity !== undefined) session.ship.velocity = Math.max(-0.5, Math.min(1, velocity));
      if (heading !== undefined) session.ship.heading = ((heading % 360) + 360) % 360;
      break;
    }

    case 'send_to_viewscreen': {
      const { payload } = msg;
      if (!payload) break;
      sendTo(session, 'viewscreen', { type: 'viewscreen_update', from: senderRole, payload });
      break;
    }

    default:
      return false;
  }

  return true;
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  createSession,
  getSession,
  deleteSession,
  joinSession,
  removePlayer,
  broadcast,
  sendTo,
  gameStateSnapshot,
  startTick,
  handleMessage,
  // exported for testing
  normaliseAllocation,
  applyOverload,
  expireOverloads,
  effectiveEnergy,
  defaultEnergy,
  defaultSystems,
};
