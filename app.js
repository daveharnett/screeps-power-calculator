(function () {
    'use strict';
    const P = window.PowerCalc;
    const $ = sel => document.querySelector(sel);
    const fmt = (x, d = 0) => Number(x).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
    const GROUPS = [['economy', 'Economy'], ['defence', 'Defence'], ['offence', 'Offence']];

    const state = { power: null, gpl: 0, creeps: [] };

    function newCreep(name) {
        return { name: name || `Operator ${state.creeps.length + 1}`, levels: {}, off: {}, on: {}, interval: {} };
    }
    function used(c, p) {
        if (c.off[p.id]) return false;
        if (c.on[p.id]) return true;
        return p.defaultUse;
    }

    // ---- URL hash: g=GPL, p=power, c=name.levels.toggles.intervals per creep ----
    function encode() {
        const parts = [];
        if (state.power != null) parts.push('p=' + state.power); else parts.push('g=' + state.gpl);
        const cs = state.creeps.map(c => {
            const digits = P.POWERS.map(p => c.levels[p.id] || 0).join('');
            const toggles = P.POWERS.filter(p => used(c, p) !== p.defaultUse).map(p => p.id).join('-');
            const ivs = Object.keys(c.interval).map(id => id + '_' + c.interval[id]).join('-');
            return [encodeURIComponent(c.name).replace(/\./g, '%2E'), digits, toggles, ivs].join('.');
        });
        parts.push('c=' + cs.join(','));
        return parts.join('&');
    }
    function decode(hash) {
        const q = new URLSearchParams(hash.replace(/^#/, ''));
        if (q.has('p')) { state.power = Math.max(0, +q.get('p') || 0); state.gpl = P.gplFromPower(state.power); }
        else if (q.has('g')) { state.power = null; state.gpl = Math.max(0, +q.get('g') || 0); }
        state.creeps = [];
        const c = q.get('c');
        if (c) c.split(',').forEach(s => {
            const [name, digits = '', toggles = '', ivs = ''] = s.split('.');
            const cr = newCreep(decodeURIComponent(name || ''));
            P.POWERS.forEach((p, i) => { const v = +digits[i] || 0; if (v) cr.levels[p.id] = Math.min(5, v); });
            toggles.split('-').filter(Boolean).forEach(id => {
                const p = P.byId[id]; if (!p) return;
                if (p.defaultUse) cr.off[id] = true; else cr.on[id] = true;
            });
            ivs.split('-').filter(Boolean).forEach(x => { const [id, iv] = x.split('_'); if (P.byId[id] && +iv > 0) cr.interval[id] = +iv; });
            state.creeps.push(cr);
        });
    }
    function save() {
        try { history.replaceState(null, '', '#' + encode()); } catch (e) { /* file:// in some browsers */ }
    }

    // ---- rendering ----
    function renderGlobal() {
        $('#power').value = state.power == null ? '' : state.power;
        $('#gpl').value = state.gpl;
        const u = P.gplUsed(state.creeps);
        $('#gplUsed').textContent = u;
        $('#gplFree').textContent = state.gpl - u;
        $('#gplFreeBox').classList.toggle('bad', state.gpl - u < 0);
        const base = state.power != null ? state.power : P.powerForGpl(state.gpl);
        $('#nextGpl').textContent = fmt(P.powerForGpl(state.gpl + 1) - base);
        $('#life').textContent = fmt(P.POWER_CREEP_LIFE_TIME);
    }

    function renderCreep(c, idx) {
        const level = P.creepLevel(c.levels);
        const stats = P.creepStats(level);
        const order = P.upgradeOrder(c.levels);
        const blockedId = order.ok ? null : order.blocked && order.blocked.id;

        let made = 0, spent = 0;
        const rows = [];
        for (const [g, gname] of GROUPS) {
            rows.push(`<tr class="group"><td colspan="8">${gname}</td></tr>`);
            for (const p of P.POWERS.filter(x => x.group === g)) {
                const lv = c.levels[p.id] || 0;
                const pips = p.info.level.map((req, k) =>
                    `<span class="pip ${k < lv ? 'on' : ''} ${req > level ? 'locked' : ''}" data-act="set" data-id="${p.id}" data-to="${k + 1}"
                      title="Level ${k + 1}: needs creep level ${req}">${req}</span>`).join('');
                let effect, econ = '', uptime = '', ops = '', iv = '';
                const use = used(c, p);
                if (lv) {
                    effect = p.describe(lv);
                    const e = P.castEconomy(p, lv, c.interval[p.id] || P.defaultInterval(p, lv));
                    iv = `<input class="iv" type="number" min="${Math.max(1, p.info.cooldown)}" value="${e.interval}" data-act="iv" data-id="${p.id}"
                          title="Cast every N ticks (default ${P.defaultInterval(p, lv)})">`;
                    if (e.uptime !== undefined) uptime = e.targets ? `${fmt(e.targets, 1)} targets` : `${fmt(e.uptime * 100)}%`;
                    if (use) {
                        if (e.opsGenPerKTick) { made += e.opsGenPerKTick; ops = `+${fmt(e.opsGenPerKTick, 1)}`; }
                        else if (e.opsPerKTick) { spent += e.opsPerKTick; ops = `−${fmt(e.opsPerKTick, 1)}`; }
                        else ops = '0';
                    } else ops = '<span class="dim">—</span>';
                } else {
                    const req = p.info.level[0];
                    effect = `<span class="dim">level 1: ${p.describe(1)}${req > 0 ? ` (needs creep level ${req})` : ''}</span>`;
                }
                const opsCost = Array.isArray(p.info.ops) ? p.info.ops.join('/') : (p.info.ops || 0);
                const dur = Array.isArray(p.info.duration) ? p.info.duration.join('/') : (p.info.duration || '—');
                rows.push(`<tr class="${blockedId === p.id ? 'unreachable' : ''}">
                  <td class="name" title="${p.source}">${p.name}<small>${p.key} · ${p.target}</small></td>
                  <td><div class="lv">
                    <button data-act="dec" data-id="${p.id}" ${lv === 0 ? 'disabled' : ''} aria-label="Lower ${p.name}">−</button>
                    <div class="pips">${pips}</div>
                    <button data-act="inc" data-id="${p.id}" ${lv === 5 || level >= P.POWER_CREEP_MAX_LEVEL ? 'disabled' : ''} aria-label="Raise ${p.name}">+</button>
                  </div></td>
                  <td class="effect">${effect}</td>
                  <td class="num">cd ${p.info.cooldown}<br>dur ${dur}<br>ops ${opsCost}${p.info.range ? `<br>range ${p.info.range}` : ''}</td>
                  <td><input type="checkbox" data-act="use" data-id="${p.id}" ${use ? 'checked' : ''} ${lv ? '' : 'disabled'} aria-label="Count ${p.name} in the ops budget"></td>
                  <td>${iv}</td>
                  <td class="num">${uptime}</td>
                  <td class="num">${ops}</td>
                </tr>`);
            }
        }

        const net = made - spent;
        const gen = c.levels[1] ? P.byId[1].info.effect[c.levels[1] - 1] : 0;
        const orderList = order.order.map(s => `<li>${P.byId[s.id].name} ${s.to} <span class="dim" style="color:var(--muted)">(at level ${s.at})</span></li>`).join('');

        return `<section class="panel" data-idx="${idx}">
          <div class="creep-head">
            <input type="text" class="name" value="${c.name.replace(/"/g, '&quot;')}" data-act="name" aria-label="Creep name">
            <span class="badge ${order.ok ? 'ok' : 'bad'}">${order.ok ? 'reachable' : 'unreachable'}</span>
            <div class="stat"><b>${level}</b><span>level / ${P.POWER_CREEP_MAX_LEVEL}</span></div>
            <div class="stat"><b>${fmt(stats.hitsMax)}</b><span>hits</span></div>
            <div class="stat"><b>${fmt(stats.storeCapacity)}</b><span>store</span></div>
            <div class="stat"><b>+${fmt(made, 1)}</b><span>ops made / 1000 t</span></div>
            <div class="stat"><b>−${fmt(spent, 1)}</b><span>ops spent / 1000 t</span></div>
            <div class="stat ${net < 0 ? 'bad' : ''}"><b>${net >= 0 ? '+' : '−'}${fmt(Math.abs(net), 1)}</b><span>net / 1000 t</span></div>
            <div class="spacer"></div>
            <button data-act="clone">Duplicate</button>
            <button data-act="reset">Clear</button>
            <button data-act="remove">Remove</button>
          </div>
          ${order.ok ? '' : `<p class="msg">${order.reason}.</p>`}
          ${net < 0 && gen ? `<p class="msg" style="background:var(--accent-soft);color:var(--accent)">Spends more ops than it makes: it lives on stock carried in (store ${fmt(stats.storeCapacity)}).</p>` : ''}
          <div class="table-wrap"><table>
            <thead><tr><th>Power</th><th>Level (pip = creep level needed)</th><th>Effect at this level</th><th>Base</th><th>Use</th><th>Every</th><th>Uptime</th><th>Ops/1000 t</th></tr></thead>
            <tbody>${rows.join('')}</tbody>
          </table></div>
          ${order.order.length ? `<details><summary>Upgrade order (${order.order.length} steps)</summary><ol class="order">${orderList}</ol></details>` : ''}
        </section>`;
    }

    function render() {
        renderGlobal();
        $('#creeps').innerHTML = state.creeps.map(renderCreep).join('');
        save();
    }

    // ---- events ----
    $('#power').addEventListener('input', e => {
        const v = e.target.value;
        if (v === '') { state.power = null; } else { state.power = Math.max(0, +v); state.gpl = P.gplFromPower(state.power); }
        renderGlobal(); save(); $('#gpl').value = state.gpl;
    });
    $('#gpl').addEventListener('input', e => {
        state.power = null; state.gpl = Math.max(0, Math.floor(+e.target.value || 0));
        renderGlobal(); save();
    });
    $('#addCreep').addEventListener('click', () => { state.creeps.push(newCreep()); render(); });
    $('#share').addEventListener('click', async e => {
        save();
        try { await navigator.clipboard.writeText(location.href); e.target.textContent = 'Copied'; }
        catch (err) { e.target.textContent = 'Copy the address bar'; }
        setTimeout(() => { e.target.textContent = 'Copy link'; }, 1500);
    });

    $('#creeps').addEventListener('click', e => {
        const el = e.target.closest('[data-act]');
        const sec = e.target.closest('section[data-idx]');
        if (!el || !sec) return;
        const idx = +sec.dataset.idx, c = state.creeps[idx], id = el.dataset.id;
        const lv = c.levels[id] || 0, level = P.creepLevel(c.levels);
        switch (el.dataset.act) {
            case 'inc': if (lv < 5 && level < P.POWER_CREEP_MAX_LEVEL) c.levels[id] = lv + 1; break;
            case 'dec': if (lv > 0) c.levels[id] = lv - 1; break;
            case 'set': {
                const to = +el.dataset.to;
                const target = to === lv ? to - 1 : to;
                if (level - lv + target > P.POWER_CREEP_MAX_LEVEL) return;
                c.levels[id] = target;
                break;
            }
            case 'clone': state.creeps.splice(idx + 1, 0, JSON.parse(JSON.stringify(Object.assign({}, c, { name: c.name + ' copy' })))); break;
            case 'reset': state.creeps[idx] = newCreep(c.name); break;
            case 'remove': state.creeps.splice(idx, 1); break;
            default: return;
        }
        if (c.levels[id] === 0) { delete c.levels[id]; delete c.interval[id]; }
        render();
    });
    $('#creeps').addEventListener('change', e => {
        const el = e.target, sec = el.closest('section[data-idx]');
        if (!sec) return;
        const c = state.creeps[+sec.dataset.idx], id = el.dataset.id, p = P.byId[id];
        if (el.dataset.act === 'use') {
            delete c.on[id]; delete c.off[id];
            if (el.checked !== p.defaultUse) (el.checked ? c.on : c.off)[id] = true;
        } else if (el.dataset.act === 'iv') {
            const v = Math.floor(+el.value);
            if (v > 0 && v !== P.defaultInterval(p, c.levels[id])) c.interval[id] = v; else delete c.interval[id];
        } else if (el.dataset.act === 'name') {
            c.name = el.value.slice(0, 50) || 'Operator';
        } else return;
        render();
    });

    window.addEventListener('hashchange', () => { decode(location.hash); render(); });

    decode(location.hash);
    if (!state.creeps.length) state.creeps.push(newCreep());
    render();
})();
