'use strict';

const { tickMission } = require('./mission1');

const ROLES = ['captain', 'helm', 'engineering', 'viewscreen'];
const TICK_INTERVAL_MS = 2000;

// ─── Default state factories ───────────────────────────────────────────────

function defaultEnergy() {
  return {
    reactorOutput: 100,      // total reactor capacity
    allocation: {
      propulsion:  30,       // each system is independent: 0..systemHealth
      shields:     20,
      lifeSupport: 15,
      sensors:     15,
      navComputer: 10,
    },
    overloads: {},           // systemKey → expiry timestamp (ms)
  };
}

function defaultSystems() {
  return {
    propulsion:  100,
    shields:     100,
    lifeSupport: 100,
    sensors:     100,
    navComputer: 100,
  };
}

function defaultShip() {
  return {
    name: "ORION'S WAKE",
    hull: 100,
    position: { x: 400, y: 300 },
    heading: 0,   // degrees, 0 = north (up)
    velocity: 0,  // -0.5..1 normalised
  };
}

// ─── Energy helpers ────────────────────────────────────────────────────────

/**
 * Clamp each allocation value to [0, systemHealth].
 * Does NOT force values to sum to any particular total.
 */
function clampAllocation(allocation, systems) {
  const result = {};
  for (const k of Object.keys(allocation)) {
    result[k] = Math.max(0, Math.min(allocation[k] ?? 0, systems[k] ?? 100));
  }
  return result;
}

/**
 * Compute total reactor load from an allocation object.
 */
function totalLoad(allocation) {
  return Object.values(allocation).reduce((s, v) => s + v, 0);
}

/**
 * Apply an overload to a system.
 * Returns updated energy + systems (does not mutate).
 */
function applyOverload(energy, systems, systemKey) {
  const now = Date.now();
  const alreadyActive = energy.overloads[systemKey] && energy.overloads[systemKey] > now;
  if (alreadyActive) return { energy, systems };

  const OVERLOAD_DURATION_MS = 30_000;
  const OVERLOAD_DAMAGE = 10;

  const newOverloads = { ...energy.overloads, [systemKey]: now + OVERLOAD_DURATION_MS };
  const newSystems = { ...systems, [systemKey]: Math.max(0, systems[systemKey] - OVERLOAD_DAMAGE) };

  // Clamp allocation to new system health caps (no redistribution)
  const newAllocation = clampAllocation(energy.allocation, newSystems);

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
 * Effective energy for a system, considering active overloads (+30%).
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
  const digits  = '0123456789';
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
    players: {},
    ship: defaultShip(),
    energy: defaultEnergy(),
    systems: defaultSystems(),
    mission: {
      type: 1,
      status: 'briefing',
      timer: 600,
      lifeSupportLowSince: null,
      reactorOverloadSince: null,
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
  const load = totalLoad(session.energy.allocation);
  return {
    type: 'game_state',
    ship: session.ship,
    energy: {
      ...session.energy,
      totalLoad: load,
      overloaded: load > session.energy.reactorOutput,
    },
    systems: session.systems,
    mission: {
      type:   session.mission.type,
      status: session.mission.status,
      timer:  session.mission.timer,
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

    session.energy = expireOverloads(session.energy);
    tickMission(session, effectiveEnergy, TICK_INTERVAL_MS);
    broadcast(session, gameStateSnapshot(session));

    if (session.mission.status === 'won' || session.mission.status === 'lost') {
      clearInterval(session.tickInterval);
      session.tickInterval = null;
    }
  }, TICK_INTERVAL_MS);
  // Allow process to exit when this is the only remaining timer (e.g. in tests).
  // unref() may not exist on fake timer objects, so guard with optional chaining.
  session.tickInterval?.unref?.();
}

// ─── Message handlers ──────────────────────────────────────────────────────

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
      // Clamp each system independently — no forced redistribution
      session.energy = {
        ...session.energy,
        allocation: clampAllocation(allocation, session.systems),
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
      // Broadcast immediately so viewscreen and captain see changes without waiting for tick
      broadcast(session, gameStateSnapshot(session));
      break;
    }

    case 'send_to_viewscreen': {
      const { payload } = msg;
      if (!payload) break;
      const vsMsg = { type: 'viewscreen_update', from: senderRole, payload };
      // Send to viewscreen screen AND captain's viewscreen area
      sendTo(session, 'viewscreen', vsMsg);
      sendTo(session, 'captain', vsMsg);
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
  clampAllocation,
  applyOverload,
  expireOverloads,
  effectiveEnergy,
  totalLoad,
  defaultEnergy,
  defaultSystems,
};
