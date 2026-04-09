'use strict';

const {
  tickMission,
  movePosition,
  maxSpeed,
  distance,
  INTERCEPT_DISTANCE,
  BASE_SPEED,
  MIN_PROPULSION,
  HULL_DECAY_RATE,
  LIFE_SUPPORT_CRITICAL,
  TARGET_HEADING_DEG,
  TARGET_SPEED,
} = require('../../server/mission1');

const { defaultEnergy, defaultSystems, effectiveEnergy } = require('../../server/session');

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeSession(overrides = {}) {
  return {
    ship: {
      name: "ORION'S WAKE",
      hull: 100,
      position: { x: 400, y: 300 },
      heading: 0,
      velocity: 0,
      ...overrides.ship,
    },
    energy: defaultEnergy(),
    systems: defaultSystems(),
    mission: {
      type: 1,
      status: 'active',
      timer: 600,
      lifeSupportLowSince: null,
      target: { x: 1800, y: 900, velocity: 0.8, heading: TARGET_HEADING_DEG },
      ...overrides.mission,
    },
    ...overrides,
  };
}

// ─── movePosition ──────────────────────────────────────────────────────────

describe('movePosition', () => {
  test('heading 0 (north) moves position upward (negative Y)', () => {
    const pos = { x: 500, y: 500 };
    const newPos = movePosition(pos, 0, 100, 1);
    expect(newPos.x).toBeCloseTo(500, 1);
    expect(newPos.y).toBeCloseTo(400, 1); // moved up
  });

  test('heading 90 (east) moves position rightward (positive X)', () => {
    const pos = { x: 500, y: 500 };
    const newPos = movePosition(pos, 90, 100, 1);
    expect(newPos.x).toBeCloseTo(600, 1);
    expect(newPos.y).toBeCloseTo(500, 1);
  });

  test('heading 180 (south) moves position downward (positive Y)', () => {
    const pos = { x: 500, y: 500 };
    const newPos = movePosition(pos, 180, 100, 1);
    expect(newPos.x).toBeCloseTo(500, 1);
    expect(newPos.y).toBeCloseTo(600, 1);
  });

  test('heading 270 (west) moves position leftward (negative X)', () => {
    const pos = { x: 500, y: 500 };
    const newPos = movePosition(pos, 270, 100, 1);
    expect(newPos.x).toBeCloseTo(400, 1);
    expect(newPos.y).toBeCloseTo(500, 1);
  });

  test('clamps position to world bounds (x >= 0)', () => {
    const pos = { x: 5, y: 500 };
    const newPos = movePosition(pos, 270, 200, 1); // heading west, would go negative
    expect(newPos.x).toBeGreaterThanOrEqual(0);
  });
});

// ─── maxSpeed ──────────────────────────────────────────────────────────────

describe('maxSpeed', () => {
  test('returns 0 when propulsion is below minimum', () => {
    expect(maxSpeed(0)).toBe(0);
    expect(maxSpeed(MIN_PROPULSION - 1)).toBe(0);
  });

  test('returns BASE_SPEED at full propulsion (100)', () => {
    expect(maxSpeed(100)).toBe(BASE_SPEED);
  });

  test('scales linearly with propulsion', () => {
    expect(maxSpeed(50)).toBeCloseTo(BASE_SPEED * 0.5, 5);
  });
});

// ─── distance ──────────────────────────────────────────────────────────────

describe('distance', () => {
  test('distance between same point is 0', () => {
    expect(distance({ x: 100, y: 200 }, { x: 100, y: 200 })).toBe(0);
  });

  test('computes Euclidean distance correctly', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

// ─── tickMission ──────────────────────────────────────────────────────────

describe('tickMission — timer', () => {
  test('decrements timer by tick duration', () => {
    const session = makeSession();
    tickMission(session, effectiveEnergy, 2000);
    expect(session.mission.timer).toBeCloseTo(598, 1);
  });

  test('does nothing when mission is not active', () => {
    const session = makeSession({ mission: { status: 'briefing', timer: 600, lifeSupportLowSince: null, target: { x: 1800, y: 900 } } });
    tickMission(session, effectiveEnergy, 2000);
    expect(session.mission.timer).toBe(600); // unchanged
  });
});

describe('tickMission — ship movement', () => {
  test('ship does not move when velocity is 0', () => {
    const session = makeSession({ ship: { position: { x: 400, y: 300 }, heading: 0, velocity: 0, hull: 100, name: "X" } });
    tickMission(session, effectiveEnergy, 2000);
    expect(session.ship.position.x).toBeCloseTo(400, 1);
    expect(session.ship.position.y).toBeCloseTo(300, 1);
  });

  test('ship moves north when heading=0 and velocity>0', () => {
    const session = makeSession({
      ship: { position: { x: 400, y: 300 }, heading: 0, velocity: 1, hull: 100, name: "X" },
    });
    tickMission(session, effectiveEnergy, 2000);
    expect(session.ship.position.y).toBeLessThan(300); // moved north (up)
  });

  test('target moves deterministically each tick', () => {
    const session = makeSession();
    const targetBefore = { ...session.mission.target };
    tickMission(session, effectiveEnergy, 2000);
    const targetAfter = session.mission.target;
    const expectedDist = TARGET_SPEED * 2; // 2 seconds
    expect(distance(targetBefore, targetAfter)).toBeCloseTo(expectedDist, 0);
  });
});

describe('tickMission — win condition', () => {
  test('sets status to won when ship reaches target', () => {
    const targetX = 1800;
    const targetY = 900;
    const session = makeSession({
      ship: {
        position: { x: targetX + INTERCEPT_DISTANCE - 10, y: targetY },
        heading: 0,
        velocity: 0,
        hull: 100,
        name: "X",
      },
      mission: {
        status: 'active',
        timer: 600,
        lifeSupportLowSince: null,
        target: { x: targetX, y: targetY },
      },
    });
    tickMission(session, effectiveEnergy, 2000);
    expect(session.mission.status).toBe('won');
  });
});

describe('tickMission — loss conditions', () => {
  test('sets status to lost when timer reaches 0', () => {
    const session = makeSession({ mission: { status: 'active', timer: 1, lifeSupportLowSince: null, target: { x: 1800, y: 900 } } });
    tickMission(session, effectiveEnergy, 2000); // tick 2s, timer was 1s
    expect(session.mission.status).toBe('lost');
  });

  test('sets status to lost when hull reaches 0', () => {
    const session = makeSession({
      ship: { position: { x: 400, y: 300 }, heading: 0, velocity: 0, hull: 0, name: "X" },
    });
    tickMission(session, effectiveEnergy, 2000);
    expect(session.mission.status).toBe('lost');
  });
});

describe('tickMission — life support hull decay', () => {
  test('hull decays when life support is critical for 30+ seconds', () => {
    const lowEnergy = {
      ...defaultEnergy(),
      allocation: {
        propulsion: 37,
        shields: 20,
        lifeSupport: 3, // below LIFE_SUPPORT_CRITICAL (10)
        sensors: 20,
        navComputer: 20,
      },
      overloads: {},
    };

    const session = makeSession({ energy: lowEnergy });
    // Simulate that life support has been low for >30s
    session.mission.lifeSupportLowSince = Date.now() - 35_000;

    const hullBefore = session.ship.hull;
    tickMission(session, effectiveEnergy, 2000);
    expect(session.ship.hull).toBeLessThan(hullBefore);
  });

  test('hull does not decay when life support is above critical', () => {
    const session = makeSession(); // default energy: lifeSupport=20
    const hullBefore = session.ship.hull;
    tickMission(session, effectiveEnergy, 2000);
    expect(session.ship.hull).toBe(hullBefore);
  });

  test('resets lifeSupportLowSince when life support recovers', () => {
    const session = makeSession();
    session.mission.lifeSupportLowSince = Date.now() - 5_000;
    tickMission(session, effectiveEnergy, 2000); // lifeSupport = 20 (default, above 10)
    expect(session.mission.lifeSupportLowSince).toBeNull();
  });

  test('sets lifeSupportLowSince when life support first goes critical', () => {
    const lowEnergy = {
      ...defaultEnergy(),
      allocation: { ...defaultEnergy().allocation, lifeSupport: 3 }, // below LIFE_SUPPORT_CRITICAL
    };
    const session = makeSession({ energy: lowEnergy });
    expect(session.mission.lifeSupportLowSince).toBeNull();

    const before = Date.now();
    tickMission(session, effectiveEnergy, 2000);

    expect(session.mission.lifeSupportLowSince).toBeGreaterThanOrEqual(before);
  });
});

describe('tickMission — reactor overload hull decay', () => {
  function makeOverloadedSession() {
    // Total allocation = 115 > reactorOutput (100)
    const energy = {
      ...defaultEnergy(),
      allocation: { propulsion: 40, shields: 30, lifeSupport: 20, sensors: 15, navComputer: 10 },
    };
    return makeSession({ energy });
  }

  test('hull decays when total load exceeds reactor output', () => {
    const session = makeOverloadedSession();
    const hullBefore = session.ship.hull;
    tickMission(session, effectiveEnergy, 2000);
    expect(session.ship.hull).toBeLessThan(hullBefore);
  });

  test('decay is proportional to excess load', () => {
    // excess = 115 - 100 = 15; overloadDecay = (15/100) * 0.5 * 2 = 0.15
    const session = makeOverloadedSession();
    tickMission(session, effectiveEnergy, 2000);
    expect(session.ship.hull).toBeCloseTo(100 - 0.15, 5);
  });

  test('resets reactorOverloadSince when load returns to normal', () => {
    const session = makeOverloadedSession();
    session.mission.reactorOverloadSince = Date.now() - 5_000;
    // Restore normal allocation
    session.energy.allocation = defaultEnergy().allocation; // sum = 90
    tickMission(session, effectiveEnergy, 2000);
    expect(session.mission.reactorOverloadSince).toBeNull();
  });

  test('hull does not decay when load is within reactor output', () => {
    const session = makeSession(); // default allocation sum = 90 < 100
    const hullBefore = session.ship.hull;
    tickMission(session, effectiveEnergy, 2000);
    expect(session.ship.hull).toBe(hullBefore);
  });
});
