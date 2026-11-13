// node test.js — checks the rules in powers.js against hand-worked cases.
'use strict';
const assert = require('assert');
const P = require('./powers.js');

let n = 0;
function t(name, fn) { fn(); n++; console.log('ok', name); }

t('GPL from power is floor(sqrt(power / 1000))', () => {
    assert.strictEqual(P.gplFromPower(0), 0);
    assert.strictEqual(P.gplFromPower(999), 0);
    assert.strictEqual(P.gplFromPower(1000), 1);
    assert.strictEqual(P.gplFromPower(3999), 1);
    assert.strictEqual(P.gplFromPower(4000), 2);
    assert.strictEqual(P.powerForGpl(30), 900000);
});

t('a creep costs one GPL plus its level', () => {
    assert.strictEqual(P.gplUsed([{ levels: {} }]), 1);
    assert.strictEqual(P.gplUsed([{ levels: { 1: 2, 2: 3 } }, { levels: { 1: 1 } }]), 8);
});

t('stats grow by 1000 hits and 100 store a level', () => {
    assert.deepStrictEqual(P.creepStats(0), { level: 0, hitsMax: 1000, storeCapacity: 100 });
    assert.deepStrictEqual(P.creepStats(25), { level: 25, hitsMax: 26000, storeCapacity: 2600 });
});

t('level 1 of a [0,2,...] power is free; level 2 needs two upgrades first', () => {
    assert.ok(P.upgradeOrder({ 1: 1 }).ok);
    assert.ok(!P.upgradeOrder({ 1: 2 }).ok);           // second step needs level 2, have 1
    assert.ok(P.upgradeOrder({ 1: 2, 2: 1 }).ok);      // GO1 at 0, OS1 at 1, GO2 at 2
    assert.ok(!P.upgradeOrder({ 1: 3, 2: 1, 5: 1 }).ok); // GO3 needs 7, the rest reach 4
});

t('regen source needs ten other upgrades first', () => {
    assert.ok(!P.upgradeOrder({ 13: 1, 1: 2, 2: 2, 5: 2, 6: 2, 19: 1 }).ok); // 9 others
    assert.ok(P.upgradeOrder({ 13: 1, 1: 2, 2: 2, 5: 2, 6: 2, 19: 2 }).ok);  // 10 others
});

t('five powers at level 5 cannot be reached: a fifth level needs creep level 22', () => {
    const r = P.upgradeOrder({ 1: 5, 2: 5, 6: 5, 13: 5, 16: 5 });
    assert.ok(!r.ok);
    assert.match(r.reason, /needs creep level 7/);  // only six first and second levels to stand on
});

t('a full level 25 build is reachable and level 26 is not', () => {
    const b = { 1: 5, 2: 5, 6: 5, 5: 4, 19: 4, 13: 2 };
    const r = P.upgradeOrder(b);
    assert.ok(r.ok, r.reason);
    assert.strictEqual(r.level, 25);
    assert.ok(!P.upgradeOrder(Object.assign({}, b, { 7: 1 })).ok);
});

t('operate controller 1 needs creep level 20', () => {
    const others = { 1: 4, 2: 4, 6: 4, 5: 4, 19: 3 };   // 19 levels
    assert.ok(!P.upgradeOrder(Object.assign({ 18: 1 }, others)).ok);
    assert.ok(P.upgradeOrder(Object.assign({ 18: 1 }, others, { 19: 4 })).ok);
});

t('cast economy: operate spawn recast on expiry', () => {
    const p = P.byId[2];
    assert.strictEqual(P.defaultInterval(p, 1), 1000);
    const e = P.castEconomy(p, 1, 1000);
    assert.strictEqual(e.opsPerKTick, 100);
    assert.strictEqual(e.uptime, 1);
});

t('cast economy: interval below cooldown is clamped', () => {
    const e = P.castEconomy(P.byId[2], 1, 10);
    assert.strictEqual(e.interval, 300);
    assert.ok(Math.abs(e.targets - 1000 / 300) < 1e-9);
});

t('generate ops 5 makes 160 ops per 1000 ticks', () => {
    assert.strictEqual(P.castEconomy(P.byId[1], 5, 50).opsGenPerKTick, 160);
});

t('disrupt terminal ops cost falls with level', () => {
    assert.strictEqual(P.castEconomy(P.byId[15], 1, 8).opsPerCast, 50);
    assert.strictEqual(P.castEconomy(P.byId[15], 5, 8).opsPerCast, 10);
});

console.log(`${n} passed`);
