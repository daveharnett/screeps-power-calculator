// Power creep data and rules, taken from the Screeps engine (screeps/common lib/constants.js,
// engine 4.2.x processor). POWER_INFO is copied verbatim; everything else in this file is how the
// engine applies it, with the source file named next to each rule.
(function (root) {
    'use strict';

    const POWER_CREEP_MAX_LEVEL = 25;
    const POWER_CREEP_LIFE_TIME = 5000;
    const POWER_LEVEL_MULTIPLY = 1000;
    const POWER_LEVEL_POW = 2;
    const LAB_REACTION_AMOUNT = 5;
    const CONTROLLER_MAX_UPGRADE_PER_TICK = 15;

    // Only the operator class exists in the engine (POWER_CLASS = {OPERATOR}). Commander and
    // executor were announced but never shipped.
    const CLASSES = ['operator'];

    const POWER_INFO = {
        1: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 50, effect: [1, 2, 4, 6, 8] },
        2: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 300, duration: 1000, range: 3, ops: 100, effect: [0.9, 0.7, 0.5, 0.35, 0.2] },
        3: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 10, duration: 100, range: 3, ops: 10, effect: [1.1, 1.2, 1.3, 1.4, 1.5] },
        4: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 800, duration: 1000, range: 3, ops: 100, effect: [500000, 1000000, 2000000, 4000000, 7000000] },
        5: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 50, duration: 1000, range: 3, ops: 10, effect: [2, 4, 6, 8, 10] },
        6: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 50, range: 3, ops: 2, effect: [0.2, 0.4, 0.6, 0.8, 1.0] },
        7: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 400, duration: [200, 400, 600, 800, 1000], range: 3, ops: 10 },
        8: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 500, duration: 1000, range: 3, ops: 100, effect: [0.9, 0.8, 0.7, 0.6, 0.5] },
        9: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 5, range: 20, ops: 10, duration: [1, 2, 3, 4, 5] },
        10: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 0, duration: 5, range: 50, ops: 10, effect: [0.9, 0.8, 0.7, 0.6, 0.5] },
        11: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 100, range: 3, ops: 100, duration: [100, 200, 300, 400, 500] },
        12: { className: 'operator', level: [0, 2, 7, 14, 22], effect: [5000, 10000, 15000, 20000, 25000], duration: 50, cooldown: 20, energy: 100 },
        13: { className: 'operator', level: [10, 11, 12, 14, 22], cooldown: 100, duration: 300, range: 3, effect: [50, 100, 150, 200, 250], period: 15 },
        14: { className: 'operator', level: [10, 11, 12, 14, 22], cooldown: 100, duration: 100, range: 3, effect: [2, 4, 6, 8, 10], period: 10 },
        15: { className: 'operator', level: [20, 21, 22, 23, 24], cooldown: 8, duration: 10, range: 50, ops: [50, 40, 30, 20, 10] },
        16: { className: 'operator', level: [10, 11, 12, 14, 22], cooldown: 800, range: 3, duration: 1000, ops: 200, effect: [1, 2, 3, 4, 5] },
        17: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 5, range: 3, ops: 5, duration: [1, 2, 3, 4, 5] },
        18: { className: 'operator', level: [20, 21, 22, 23, 24], cooldown: 800, range: 3, duration: 1000, ops: 200, effect: [10, 20, 30, 40, 50] },
        19: { className: 'operator', level: [0, 2, 7, 14, 22], cooldown: 800, range: 3, duration: 1000, ops: 100 },
    };

    const pct = x => Math.round(x * 100) + '%';
    const num = x => x.toLocaleString('en-US');

    // key: the PWR_ constant; group: how the page groups it; defaultUse: counted in the ops budget
    // unless the user unticks it; sustained: a lasting effect you keep up (default cast interval is
    // max(cooldown, duration)) rather than a one-shot cast every cooldown.
    // describe(i): the effect at power level i (1-5), as the engine applies it.
    const POWERS = [
        { id: 1, key: 'PWR_GENERATE_OPS', name: 'Generate ops', group: 'economy', defaultUse: true, sustained: false,
          target: 'self',
          describe: i => `+${POWER_INFO[1].effect[i - 1]} ops into the creep's store; any excess over its capacity is dropped`,
          source: 'processor/intents/power-creeps/usePower.js' },
        { id: 2, key: 'PWR_OPERATE_SPAWN', name: 'Operate spawn', group: 'economy', defaultUse: true, sustained: true,
          target: 'spawn',
          describe: i => { const e = POWER_INFO[2].effect[i - 1]; return `spawn time ×${e} (${pct(1 - e)} faster), rounded up; only creeps that start spawning while it is active`; },
          source: 'processor/intents/spawns/create-creep.js' },
        { id: 3, key: 'PWR_OPERATE_TOWER', name: 'Operate tower', group: 'defence', defaultUse: false, sustained: true,
          target: 'tower',
          describe: i => `tower attack, heal and repair ×${POWER_INFO[3].effect[i - 1]}`,
          source: 'processor/intents/towers/attack.js' },
        { id: 4, key: 'PWR_OPERATE_STORAGE', name: 'Operate storage', group: 'economy', defaultUse: false, sustained: true,
          target: 'storage',
          describe: i => `storage capacity +${num(POWER_INFO[4].effect[i - 1])}`,
          source: 'processor/intents/storages/tick.js' },
        { id: 5, key: 'PWR_OPERATE_LAB', name: 'Operate lab', group: 'economy', defaultUse: true, sustained: true,
          target: 'lab',
          describe: i => { const e = POWER_INFO[5].effect[i - 1]; return `reaction amount ${LAB_REACTION_AMOUNT + e} instead of ${LAB_REACTION_AMOUNT} (×${(LAB_REACTION_AMOUNT + e) / LAB_REACTION_AMOUNT}); one lab per cast`; },
          source: 'processor/intents/labs/run-reaction.js' },
        { id: 6, key: 'PWR_OPERATE_EXTENSION', name: 'Operate extension', group: 'economy', defaultUse: true, sustained: false,
          target: 'storage, terminal, factory or container',
          describe: i => `instantly fills up to ${pct(POWER_INFO[6].effect[i - 1])} of the room's total extension capacity from the target, nearest extensions first`,
          source: 'processor/intents/power-creeps/usePower.js' },
        { id: 7, key: 'PWR_OPERATE_OBSERVER', name: 'Operate observer', group: 'economy', defaultUse: false, sustained: true,
          target: 'observer',
          describe: i => `observer range unlimited for ${POWER_INFO[7].duration[i - 1]} ticks`,
          source: 'game/structures.js' },
        { id: 8, key: 'PWR_OPERATE_TERMINAL', name: 'Operate terminal', group: 'economy', defaultUse: false, sustained: true,
          target: 'terminal',
          describe: i => { const e = POWER_INFO[8].effect[i - 1]; return `send and deal energy cost ×${e} (rounded up) and terminal cooldown ×${e}`; },
          source: 'processor/intents/terminal/send.js, processor/global-intents/market.js' },
        { id: 9, key: 'PWR_DISRUPT_SPAWN', name: 'Disrupt spawn', group: 'offence', defaultUse: false, sustained: false,
          target: 'spawn (any owner)',
          describe: i => `the spawn's current creep is delayed ${POWER_INFO[9].duration[i - 1]} tick${i > 1 ? 's' : ''}`,
          source: 'processor/intents/spawns/tick.js' },
        { id: 10, key: 'PWR_DISRUPT_TOWER', name: 'Disrupt tower', group: 'offence', defaultUse: false, sustained: false,
          target: 'tower (any owner)',
          describe: i => `tower attack, heal and repair ×${POWER_INFO[10].effect[i - 1]} for 5 ticks`,
          source: 'processor/intents/towers/attack.js' },
        { id: 11, key: 'PWR_DISRUPT_SOURCE', name: 'Disrupt source', group: 'offence', defaultUse: false, sustained: false,
          target: 'source',
          describe: i => `source regeneration paused for ${POWER_INFO[11].duration[i - 1]} ticks`,
          source: 'processor/intents/sources/tick.js' },
        { id: 12, key: 'PWR_SHIELD', name: 'Shield', group: 'defence', defaultUse: false, sustained: false,
          target: 'self (its tile)',
          describe: i => `a ${num(POWER_INFO[12].effect[i - 1])}-hit rampart on the creep's tile for 50 ticks; POWER_INFO lists 100 energy, which the engine never charges`,
          source: 'processor/intents/power-creeps/usePower.js' },
        { id: 13, key: 'PWR_REGEN_SOURCE', name: 'Regen source', group: 'economy', defaultUse: true, sustained: true,
          target: 'source',
          describe: i => { const e = POWER_INFO[13].effect[i - 1]; return `+${e} energy every 15 ticks for 300 ticks: ${e * 20} per cast, ${(e / 15).toFixed(1)}/tick (capped at the source's capacity)`; },
          source: 'processor/intents/sources/tick.js' },
        { id: 14, key: 'PWR_REGEN_MINERAL', name: 'Regen mineral', group: 'economy', defaultUse: false, sustained: true,
          target: 'mineral (not depleted)',
          describe: i => { const e = POWER_INFO[14].effect[i - 1]; return `+${e} mineral every 10 ticks for 100 ticks: ${e * 10} per cast; refused while the mineral is regenerating`; },
          source: 'processor/intents/minerals/tick.js' },
        { id: 15, key: 'PWR_DISRUPT_TERMINAL', name: 'Disrupt terminal', group: 'offence', defaultUse: false, sustained: false,
          target: 'terminal (any owner)',
          describe: () => `creeps cannot withdraw from the terminal (nor operate extension from it) for 10 ticks`,
          source: 'processor/intents/creeps/withdraw.js' },
        { id: 16, key: 'PWR_OPERATE_POWER', name: 'Operate power', group: 'economy', defaultUse: true, sustained: true,
          target: 'power spawn',
          describe: i => { const n = 1 + POWER_INFO[16].effect[i - 1]; return `power spawn processes ${n} power a tick instead of 1 (${n * 50} energy a tick)`; },
          source: 'processor/intents/power-spawns/process-power.js' },
        { id: 17, key: 'PWR_FORTIFY', name: 'Fortify', group: 'defence', defaultUse: false, sustained: false,
          target: 'rampart or wall',
          describe: i => `target takes no damage for ${POWER_INFO[17].duration[i - 1]} tick${i > 1 ? 's' : ''}`,
          source: 'processor/intents/_damage.js' },
        { id: 18, key: 'PWR_OPERATE_CONTROLLER', name: 'Operate controller', group: 'economy', defaultUse: false, sustained: true,
          target: 'controller (RCL 8)',
          describe: i => `RCL 8 upgrade limit ${CONTROLLER_MAX_UPGRADE_PER_TICK + POWER_INFO[18].effect[i - 1]} a tick instead of ${CONTROLLER_MAX_UPGRADE_PER_TICK}`,
          source: 'processor/intents/creeps/upgradeController.js' },
        { id: 19, key: 'PWR_OPERATE_FACTORY', name: 'Operate factory', group: 'economy', defaultUse: true, sustained: true,
          target: 'factory',
          describe: i => `level ${i} commodities can be produced; the first cast sets an unlevelled factory to level ${i} for good, after which only a level-${i} operator can operate it`,
          source: 'processor/intents/factories/produce.js' },
    ];

    const byId = {};
    POWERS.forEach(p => { p.info = POWER_INFO[p.id]; byId[p.id] = p; });

    function at(value, level) {
        if (value === undefined) return undefined;
        return Array.isArray(value) ? value[level - 1] : value;
    }

    // GPL from total power processed (engine: createPowerCreep.js, upgradePowerCreep.js).
    function gplFromPower(power) {
        return Math.floor(Math.pow((power || 0) / POWER_LEVEL_MULTIPLY, 1 / POWER_LEVEL_POW));
    }
    function powerForGpl(gpl) {
        return POWER_LEVEL_MULTIPLY * Math.pow(gpl, POWER_LEVEL_POW);
    }

    // Each power creep costs one GPL to create and one per level.
    function gplUsed(creeps) {
        return creeps.reduce((sum, c) => sum + 1 + creepLevel(c.levels), 0);
    }

    function creepLevel(levels) {
        return Object.values(levels).reduce((a, b) => a + b, 0);
    }

    // Every upgrade raises the creep's level by one, +1000 hits and +100 store
    // (upgradePowerCreep.js; a new creep has 1000 hits and 100 store).
    function creepStats(level) {
        return { level, hitsMax: 1000 * (level + 1), storeCapacity: 100 * (level + 1) };
    }

    // Can a creep reach this set of power levels, and in what order? Taking a power from k to k+1
    // needs the creep's level (its upgrades so far) to be at least info.level[k]. Requirements only
    // ever unlock as the level rises, so taking any upgrade that is available never blocks another:
    // the build is reachable iff the greedy order (cheapest requirement first) completes.
    function upgradeOrder(levels) {
        const pending = [];
        for (const id of Object.keys(levels)) {
            const p = byId[id];
            for (let k = 0; k < levels[id]; k++) pending.push({ id: +id, to: k + 1, needs: p.info.level[k] });
        }
        pending.sort((a, b) => a.needs - b.needs || a.id - b.id || a.to - b.to);
        const order = [];
        let level = 0;
        for (const step of pending) {
            if (step.needs > level) {
                return { ok: false, order, blocked: step, level,
                    reason: `${byId[step.id].name} ${step.to} needs creep level ${step.needs}, but the other powers only reach ${level}` };
            }
            order.push(Object.assign({ at: level }, step));
            level++;
        }
        if (level > POWER_CREEP_MAX_LEVEL) {
            return { ok: false, order, level, reason: `level ${level} is over the maximum of ${POWER_CREEP_MAX_LEVEL}` };
        }
        return { ok: true, order, level };
    }

    // The cast interval a power is costed at by default: a lasting effect is recast when it runs out
    // (or when the cooldown allows, if that is later); a one-shot is cast every cooldown.
    function defaultInterval(p, level) {
        const cd = Math.max(1, p.info.cooldown);
        const dur = at(p.info.duration, level);
        return p.sustained && dur ? Math.max(cd, dur) : cd;
    }

    // Ops and uptime for one power cast every `interval` ticks.
    function castEconomy(p, level, interval) {
        const cd = Math.max(1, p.info.cooldown);
        const iv = Math.max(cd, interval || cd);
        const ops = at(p.info.ops, level) || 0;
        const dur = at(p.info.duration, level);
        const out = { interval: iv, opsPerCast: ops, opsPerKTick: 1000 * ops / iv };
        if (dur) out.uptime = Math.min(1, dur / iv);
        if (dur && dur > iv) out.targets = dur / iv;
        if (p.id === 1) out.opsGenPerKTick = 1000 * at(p.info.effect, level) / iv;
        return out;
    }

    const api = { POWER_INFO, POWERS, byId, CLASSES, POWER_CREEP_MAX_LEVEL, POWER_CREEP_LIFE_TIME,
        at, gplFromPower, powerForGpl, gplUsed, creepLevel, creepStats, upgradeOrder, defaultInterval, castEconomy };

    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.PowerCalc = api;
})(typeof self !== 'undefined' ? self : this);
