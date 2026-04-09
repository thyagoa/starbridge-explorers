'use strict';

const {
  clampAllocation,
  applyOverload,
  expireOverloads,
  effectiveEnergy,
  totalLoad,
  defaultEnergy,
  defaultSystems,
} = require('../../server/session');

describe('defaultEnergy', () => {
  test('allocation values do NOT need to sum to 100', () => {
    const energy = defaultEnergy();
    const sum = Object.values(energy.allocation).reduce((s, v) => s + v, 0);
    // Default is 90 (10 units of spare capacity)
    expect(sum).toBe(90);
    expect(sum).toBeLessThanOrEqual(energy.reactorOutput);
  });

  test('has a reactorOutput field', () => {
    expect(defaultEnergy().reactorOutput).toBe(100);
  });
});

describe('totalLoad', () => {
  test('sums all allocation values', () => {
    const alloc = { propulsion: 30, shields: 20, lifeSupport: 15, sensors: 15, navComputer: 10 };
    expect(totalLoad(alloc)).toBe(90);
  });

  test('detects overload when sum exceeds reactorOutput', () => {
    const alloc = { propulsion: 60, shields: 60, lifeSupport: 15, sensors: 15, navComputer: 10 };
    const energy = { ...defaultEnergy(), allocation: alloc };
    expect(totalLoad(alloc)).toBeGreaterThan(energy.reactorOutput);
  });
});

describe('clampAllocation', () => {
  const systems = defaultSystems(); // all at 100

  test('does NOT force values to sum to any fixed total', () => {
    const alloc = { propulsion: 30, shields: 20, lifeSupport: 15, sensors: 15, navComputer: 10 };
    const result = clampAllocation(alloc, systems);
    const sum = Object.values(result).reduce((s, v) => s + v, 0);
    expect(sum).toBe(90); // preserved as-is
  });

  test('each system can be set independently', () => {
    const alloc = { propulsion: 80, shields: 80, lifeSupport: 80, sensors: 80, navComputer: 80 };
    const result = clampAllocation(alloc, systems);
    // All should stay at 80 (each capped by system health of 100)
    for (const v of Object.values(result)) expect(v).toBe(80);
  });

  test('clamps values to system health cap', () => {
    const damagedSystems = { ...systems, propulsion: 30 };
    const alloc = { propulsion: 80, shields: 20, lifeSupport: 15, sensors: 15, navComputer: 10 };
    const result = clampAllocation(alloc, damagedSystems);
    expect(result.propulsion).toBe(30);   // capped to health
    expect(result.shields).toBe(20);      // unchanged
  });

  test('clamps values to minimum 0', () => {
    const alloc = { propulsion: -10, shields: 20, lifeSupport: 15, sensors: 15, navComputer: 10 };
    const result = clampAllocation(alloc, systems);
    expect(result.propulsion).toBe(0);
  });

  test('moving one slider does NOT affect other sliders', () => {
    const alloc = { propulsion: 30, shields: 20, lifeSupport: 15, sensors: 15, navComputer: 10 };
    const changed = { ...alloc, propulsion: 60 }; // increase propulsion
    const result = clampAllocation(changed, systems);
    expect(result.shields).toBe(20);      // unchanged
    expect(result.lifeSupport).toBe(15);  // unchanged
    expect(result.sensors).toBe(15);      // unchanged
    expect(result.navComputer).toBe(10);  // unchanged
    expect(result.propulsion).toBe(60);   // only this changed
  });
});

describe('applyOverload', () => {
  test('causes 10 damage to the target system', () => {
    const energy  = defaultEnergy();
    const systems = defaultSystems();
    const { systems: newSystems } = applyOverload(energy, systems, 'shields');
    expect(newSystems.shields).toBe(90);
  });

  test('other systems are NOT damaged', () => {
    const energy  = defaultEnergy();
    const systems = defaultSystems();
    const { systems: newSystems } = applyOverload(energy, systems, 'shields');
    expect(newSystems.propulsion).toBe(100);
    expect(newSystems.lifeSupport).toBe(100);
  });

  test('sets an expiry timestamp ~30s in the future', () => {
    const energy  = defaultEnergy();
    const systems = defaultSystems();
    const before  = Date.now();
    const { energy: newEnergy } = applyOverload(energy, systems, 'propulsion');
    const after   = Date.now();
    expect(newEnergy.overloads.propulsion).toBeGreaterThan(before + 29_000);
    expect(newEnergy.overloads.propulsion).toBeLessThanOrEqual(after + 30_000);
  });

  test('ignores duplicate overload on same system', () => {
    const energy  = defaultEnergy();
    const systems = defaultSystems();
    const { energy: e1, systems: s1 } = applyOverload(energy, systems, 'shields');
    const { systems: s2 } = applyOverload(e1, s1, 'shields');
    expect(s2.shields).toBe(s1.shields); // no extra damage
  });

  test('clamps allocation after damage reduces system cap', () => {
    // If shields health goes to 90, any allocation above 90 should be clamped
    const energy  = { ...defaultEnergy(), allocation: { ...defaultEnergy().allocation, shields: 95 } };
    const systems = defaultSystems();
    const { energy: newEnergy } = applyOverload(energy, systems, 'shields');
    // shields health → 90, allocation was 95 → should be clamped to 90
    expect(newEnergy.allocation.shields).toBeLessThanOrEqual(90);
  });

  test('total load can exceed reactorOutput (no forced redistribution)', () => {
    const energy  = { ...defaultEnergy(), allocation: { propulsion:40, shields:40, lifeSupport:20, sensors:15, navComputer:10 } };
    const systems = defaultSystems();
    const { energy: newEnergy } = applyOverload(energy, systems, 'sensors');
    // Other allocations should be untouched
    expect(newEnergy.allocation.propulsion).toBe(40);
    expect(newEnergy.allocation.shields).toBe(40);
  });
});

describe('expireOverloads', () => {
  test('removes expired overloads', () => {
    const energy = { ...defaultEnergy(), overloads: { propulsion: Date.now() - 1000 } };
    const result = expireOverloads(energy);
    expect(result.overloads.propulsion).toBeUndefined();
  });

  test('keeps active overloads', () => {
    const expiry = Date.now() + 20_000;
    const energy = { ...defaultEnergy(), overloads: { shields: expiry } };
    const result = expireOverloads(energy);
    expect(result.overloads.shields).toBe(expiry);
  });
});

describe('effectiveEnergy', () => {
  test('returns base allocation when no overload', () => {
    const energy = defaultEnergy(); // propulsion = 30
    expect(effectiveEnergy(energy, 'propulsion')).toBe(30);
  });

  test('returns 130% of allocation when overloaded', () => {
    const energy = {
      ...defaultEnergy(),
      allocation: { ...defaultEnergy().allocation, shields: 20 },
      overloads: { shields: Date.now() + 20_000 },
    };
    expect(effectiveEnergy(energy, 'shields')).toBe(Math.round(20 * 1.3)); // 26
  });

  test('returns base value when overload has expired', () => {
    const energy = { ...defaultEnergy(), overloads: { sensors: Date.now() - 1000 } };
    expect(effectiveEnergy(energy, 'sensors')).toBe(defaultEnergy().allocation.sensors);
  });

  test('navComputer below 15 means nav suggestions offline', () => {
    const energy = { ...defaultEnergy(), allocation: { ...defaultEnergy().allocation, navComputer: 10 }, overloads: {} };
    expect(effectiveEnergy(energy, 'navComputer')).toBeLessThan(15);
  });
});
