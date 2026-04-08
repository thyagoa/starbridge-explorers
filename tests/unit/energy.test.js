'use strict';

const {
  normaliseAllocation,
  applyOverload,
  expireOverloads,
  effectiveEnergy,
  defaultEnergy,
  defaultSystems,
} = require('../../server/session');

describe('normaliseAllocation', () => {
  const systems = defaultSystems(); // all at 100

  test('sum of normalised allocation equals 100', () => {
    const allocation = { propulsion: 50, shields: 30, lifeSupport: 10, sensors: 5, navComputer: 5 };
    const result = normaliseAllocation(allocation, systems);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  test('proportions are preserved after normalisation', () => {
    const allocation = { propulsion: 20, shields: 20, lifeSupport: 20, sensors: 20, navComputer: 20 };
    const result = normaliseAllocation(allocation, systems);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
    // Each should be equal (20%)
    expect(result.propulsion).toBe(result.shields);
  });

  test('clamps values to system health cap', () => {
    const damagedSystems = { ...systems, propulsion: 30 };
    // Try to allocate 80 to propulsion — should be capped to 30
    const allocation = { propulsion: 80, shields: 5, lifeSupport: 5, sensors: 5, navComputer: 5 };
    const result = normaliseAllocation(allocation, damagedSystems);
    expect(result.propulsion).toBeLessThanOrEqual(30);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });

  test('handles all-zero gracefully by distributing evenly', () => {
    const allocation = { propulsion: 0, shields: 0, lifeSupport: 0, sensors: 0, navComputer: 0 };
    const result = normaliseAllocation(allocation, systems);
    const sum = Object.values(result).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });
});

describe('applyOverload', () => {
  test('causes 10 damage to the target system', () => {
    const energy = defaultEnergy();
    const systems = defaultSystems();
    const { systems: newSystems } = applyOverload(energy, systems, 'shields');
    expect(newSystems.shields).toBe(90);
  });

  test('sets an expiry timestamp on the overload', () => {
    const energy = defaultEnergy();
    const systems = defaultSystems();
    const before = Date.now();
    const { energy: newEnergy } = applyOverload(energy, systems, 'propulsion');
    const after = Date.now();
    expect(newEnergy.overloads.propulsion).toBeGreaterThan(before + 29_000);
    expect(newEnergy.overloads.propulsion).toBeLessThanOrEqual(after + 30_000);
  });

  test('ignores duplicate overload on same system', () => {
    const energy = defaultEnergy();
    const systems = defaultSystems();
    const { energy: e1, systems: s1 } = applyOverload(energy, systems, 'shields');
    const { systems: s2 } = applyOverload(e1, s1, 'shields');
    // No extra damage on second call
    expect(s2.shields).toBe(s1.shields);
  });

  test('allocation sum remains 100 after overload', () => {
    const energy = defaultEnergy();
    const systems = defaultSystems();
    const { energy: newEnergy } = applyOverload(energy, systems, 'navComputer');
    const sum = Object.values(newEnergy.allocation).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });
});

describe('expireOverloads', () => {
  test('removes expired overloads', () => {
    const energy = {
      ...defaultEnergy(),
      overloads: { propulsion: Date.now() - 1000 }, // already expired
    };
    const result = expireOverloads(energy);
    expect(result.overloads.propulsion).toBeUndefined();
  });

  test('keeps active overloads', () => {
    const expiry = Date.now() + 20_000;
    const energy = {
      ...defaultEnergy(),
      overloads: { shields: expiry },
    };
    const result = expireOverloads(energy);
    expect(result.overloads.shields).toBe(expiry);
  });
});

describe('effectiveEnergy', () => {
  test('returns base allocation when no overload', () => {
    const energy = defaultEnergy(); // propulsion = 40
    const result = effectiveEnergy(energy, 'propulsion');
    expect(result).toBe(40);
  });

  test('returns 130% of allocation when overloaded', () => {
    const energy = {
      ...defaultEnergy(),
      allocation: { ...defaultEnergy().allocation, shields: 20 },
      overloads: { shields: Date.now() + 20_000 }, // active overload
    };
    const result = effectiveEnergy(energy, 'shields');
    expect(result).toBe(Math.round(20 * 1.3)); // 26
  });

  test('returns base value when overload has expired', () => {
    const energy = {
      ...defaultEnergy(),
      overloads: { sensors: Date.now() - 1000 }, // expired
    };
    const result = effectiveEnergy(energy, 'sensors');
    expect(result).toBe(defaultEnergy().allocation.sensors);
  });

  test('navComputer threshold: below 15 disables nav suggestions flag', () => {
    const energy = {
      ...defaultEnergy(),
      allocation: { ...defaultEnergy().allocation, navComputer: 10 },
      overloads: {},
    };
    const val = effectiveEnergy(energy, 'navComputer');
    expect(val).toBeLessThan(15);
  });
});
