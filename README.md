# Screeps power creep calculator

A build planner for Screeps power creeps, in the spirit of the
[creep body calculator](https://github.com/ScreepsPlus/body-calculator), built from the engine's
own `POWER_INFO` rather than from the announced design. It covers what the official power planner
gets wrong: it has `PWR_OPERATE_FACTORY`, and it has only the operator class, because commander and
executor were never shipped.

For each operator it shows:

- whether the build can be reached at all, and an upgrade order that reaches it (taking a power
  from level *k* to *k*+1 needs the creep to already be at `POWER_INFO[power].level[k]`);
- level, hits and store;
- what every power does at its chosen level, as the engine's processor applies it;
- the ops it makes (generate ops) against what its powers spend, at a cast interval per power you
  can edit, with the uptime or the number of targets that interval covers;
- the GPL the creeps cost (one per creep plus one per level) against your GPL or power processed.

Builds live in the URL hash, so a link shares one.

## Use

Open `index.html` through any static server, for example
`python -m http.server --directory .`, or at the repo's GitHub Pages site.

## Files

- `powers.js`: the data (`POWER_INFO` verbatim) and the rules, with the engine source file for
  each effect. Loads in a browser or in Node.
- `app.js`, `index.html`: the page.
- `test.js`: `node test.js` checks the rules against hand-worked cases.

## Engine notes the page reflects

- `PWR_SHIELD` lists `energy: 100` in `POWER_INFO`, but the engine never charges it.
- `PWR_OPERATE_SPAWN` speeds up only creeps that start spawning while it is active.
- `PWR_OPERATE_FACTORY` sets an unlevelled factory to the operator's power level for good; after
  that only an operator with the same level can operate it.
- `PWR_REGEN_MINERAL` is refused while the mineral is regenerating.
