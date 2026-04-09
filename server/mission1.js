'use strict';

/**
 * Mission 1 — Interception / Pursuit
 *
 * Scenario: A sabotaged allied ship is on a collision course with a planet.
 * The crew must intercept it within 10 minutes.
 *
 * Map dimensions: 2800 × 2200 (matching the Helm canvas world size).
 * Intercept distance threshold: 200 units.
 */

const WORLD_W = 2800;
const WORLD_H = 2200;

// World-units per second at velocity=1 with propulsion=100
const BASE_SPEED = 120;

// Minimum energy on propulsion to move at all
const MIN_PROPULSION = 5;

// Life support below this value triggers hull decay
const LIFE_SUPPORT_CRITICAL = 10;

// Hull decay per second when life support is critical
const HULL_DECAY_RATE = 0.5; // hull points / second

// Distance (world units) to count as interception
const INTERCEPT_DISTANCE = 200;

// Fixed map: named star systems for the Helm canvas
// (mirrors the seed=42 generation from the prototype — kept deterministic)
const MAP_SYSTEMS = [
  { id: 0,  name: 'Aldara',    region: 'fleet',     px: 350,  py: 280,  poi: 'Base Frota',       isBase: true,  planets: 3, threat: 5  },
  { id: 1,  name: 'Vex Prime', region: 'fleet',     px: 520,  py: 180,  poi: 'Estaleiro',        isBase: false, planets: 2, threat: 10 },
  { id: 2,  name: 'Kalon',     region: 'fleet',     px: 260,  py: 420,  poi: 'Estação Orbital',  isBase: false, planets: 4, threat: 8  },
  { id: 3,  name: 'Serith',    region: 'frontier',  px: 780,  py: 260,  poi: 'Posto Avançado',   isBase: false, planets: 2, threat: 25 },
  { id: 4,  name: 'Dovan',     region: 'frontier',  px: 900,  py: 450,  poi: 'Colônia',          isBase: false, planets: 3, threat: 30 },
  { id: 5,  name: 'Neth-7',    region: 'frontier',  px: 700,  py: 600,  poi: 'Relay',            isBase: false, planets: 1, threat: 35 },
  { id: 6,  name: 'Orrath',    region: 'frontier',  px: 1050, py: 300,  poi: 'Nebulosa Densa',   isBase: false, planets: 2, threat: 40 },
  { id: 7,  name: 'Suleth',    region: 'contested', px: 1300, py: 480,  poi: 'Ruínas',           isBase: false, planets: 3, threat: 55 },
  { id: 8,  name: 'Pyrax',     region: 'contested', px: 1480, py: 300,  poi: 'Fortaleza Inimiga',isBase: false, planets: 2, threat: 70 },
  { id: 9,  name: 'Coven',     region: 'contested', px: 1200, py: 650,  poi: 'Campo de Destroços',isBase:false, planets: 1, threat: 60 },
  { id: 10, name: 'Illax',     region: 'contested', px: 1600, py: 550,  poi: 'Anomalia',         isBase: false, planets: 2, threat: 65 },
  { id: 11, name: 'Dresh',     region: 'deep',      px: 1900, py: 400,  poi: 'Vazio',            isBase: false, planets: 1, threat: 80 },
  { id: 12, name: 'Valon',     region: 'deep',      px: 2100, py: 600,  poi: 'Singularidade',    isBase: false, planets: 0, threat: 90 },
  { id: 13, name: 'Zerith',    region: 'deep',      px: 1800, py: 750,  poi: 'Anomalia Subespac.',isBase:false, planets: 2, threat: 85 },
  { id: 14, name: 'Moran',     region: 'deep',      px: 2300, py: 450,  poi: 'Planeta Morto',    isBase: false, planets: 3, threat: 88 },
];

// Routes between system IDs
const MAP_ROUTES = [
  [0, 1], [0, 2], [1, 3], [2, 5], [3, 4], [3, 6], [4, 5], [4, 7],
  [5, 9], [6, 7], [7, 8], [7, 9], [8, 10], [9, 10], [10, 11],
  [11, 12], [11, 13], [12, 14], [13, 12],
];

// Target ship start position (deep space, moving toward fleet)
const TARGET_START = { x: 1800, y: 900 };

// Target movement: heading 225° (SW toward fleet zone), speed 0.8 units/s
const TARGET_HEADING_DEG = 225;
const TARGET_SPEED = 0.8; // world units per second

/**
 * Convert degrees to radians.
 */
function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Compute Euclidean distance between two points.
 */
function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Move a position by speed * dt seconds in the given heading (degrees).
 * 0° = north (up = negative Y), 90° = east, 180° = south, 270° = west.
 * Clamps to world bounds.
 */
function movePosition(pos, headingDeg, speed, dt) {
  const rad = degToRad(headingDeg);
  return {
    x: Math.max(0, Math.min(WORLD_W, pos.x + Math.sin(rad) * speed * dt)),
    y: Math.max(0, Math.min(WORLD_H, pos.y - Math.cos(rad) * speed * dt)),
  };
}

/**
 * Maximum speed (world units/s) based on propulsion energy (0-100).
 */
function maxSpeed(propulsionEnergy) {
  if (propulsionEnergy < MIN_PROPULSION) return 0;
  return BASE_SPEED * (propulsionEnergy / 100);
}

/**
 * Perform one tick of the mission simulation.
 * Mutates session.ship, session.mission, session.systems in-place.
 *
 * @param {object} session
 * @param {function} effectiveEnergy  - (energy, systemKey) → number
 * @param {number}   tickMs           - tick interval in milliseconds
 */
function tickMission(session, effectiveEnergy, tickMs) {
  const dt = tickMs / 1000; // seconds per tick
  const { ship, energy, systems, mission } = session;

  if (mission.status !== 'active') return;

  // 1. Decrement timer
  mission.timer = Math.max(0, mission.timer - dt);

  // 2. Move the player ship
  const propEnergy = effectiveEnergy(energy, 'propulsion');
  const speed = maxSpeed(propEnergy) * ship.velocity;
  if (speed !== 0) {
    ship.position = movePosition(ship.position, ship.heading, speed, dt);
  }

  // 3. Move the target ship
  mission.target = {
    ...mission.target,
    ...movePosition(mission.target, TARGET_HEADING_DEG, TARGET_SPEED, dt),
  };

  // 4. Life support hull decay
  const lsEnergy = effectiveEnergy(energy, 'lifeSupport');
  if (lsEnergy < LIFE_SUPPORT_CRITICAL) {
    if (!mission.lifeSupportLowSince) {
      mission.lifeSupportLowSince = Date.now();
    }
    const lowSeconds = (Date.now() - mission.lifeSupportLowSince) / 1000;
    if (lowSeconds >= 30) {
      ship.hull = Math.max(0, ship.hull - HULL_DECAY_RATE * dt);
    }
  } else {
    mission.lifeSupportLowSince = null;
  }

  // 5. Reactor overload hull decay
  const load = Object.values(energy.allocation).reduce((s, v) => s + v, 0);
  const isOverloaded = load > energy.reactorOutput;
  if (isOverloaded) {
    if (!mission.reactorOverloadSince) {
      mission.reactorOverloadSince = Date.now();
    }
    // Immediate decay proportional to excess load
    const excess = load - energy.reactorOutput;
    const overloadDecay = (excess / energy.reactorOutput) * HULL_DECAY_RATE * dt;
    ship.hull = Math.max(0, ship.hull - overloadDecay);
  } else {
    mission.reactorOverloadSince = null;
  }

  // 6. Check win condition: intercepted target
  const dist = distance(ship.position, mission.target);
  if (dist <= INTERCEPT_DISTANCE) {
    mission.status = 'won';
    return;
  }

  // 7. Check loss conditions
  if (ship.hull <= 0) {
    mission.status = 'lost';
    return;
  }
  if (mission.timer <= 0) {
    mission.status = 'lost';
    return;
  }

}

module.exports = {
  tickMission,
  movePosition,
  maxSpeed,
  distance,
  MAP_SYSTEMS,
  MAP_ROUTES,
  TARGET_START,
  INTERCEPT_DISTANCE,
  BASE_SPEED,
  MIN_PROPULSION,
  HULL_DECAY_RATE,
  LIFE_SUPPORT_CRITICAL,
  TARGET_HEADING_DEG,
  TARGET_SPEED,
};
