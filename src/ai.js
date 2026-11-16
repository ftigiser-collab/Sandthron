// Gegner-KI und Auto-Ernter (gemeinsam genutzt)
import { UNITS, BUILDINGS } from './data.js';
import { distance, neighbors } from './hex.js';

const PLAN = ['windfalle', 'raffinerie', 'kaserne', 'windfalle', 'fabrik', 'turm', 'raffinerie', 'ausguck', 'windfalle', 'turm', 'horst', 'flak', 'windfalle', 'fabrik', 'turm', 'windfalle', 'raffinerie', 'turm', 'flak', 'windfalle'];

function value(g, e) {
  if (e.isBuilding) return e.type === 'bauhof' ? 2500 : e.def.weapon ? 900 : e.def.cost * 0.6;
  return e.def.cost * (e.def.harvester ? 1.4 : 1);
}

export function dangerFn(g, owner) {
  const knows = (w) => owner !== 0 || g.wormSeen(w);
  return (c, r) => {
    let d = 0;
    if (g.stormNext(c, r)) d += 8;
    if (g.isSand(c, r)) for (const w of g.worms) if (knows(w) && distance(c, r, w.c, w.r) <= 4) d += 5 - distance(c, r, w.c, w.r);
    return d;
  };
}

// ---------- Auto-Ernter ----------
export async function autoHarvest(g, u, act) {
  if (u.dead || u.moved || u.carried) return;
  const cap = u.def.capacity;
  const danger = dangerFn(g, u.owner);
  const here = danger(u.c, u.r);
  const refs = g.buildings.filter((b) => !b.dead && b.owner === u.owner && b.type === 'raffinerie' && b.turnsLeft <= 0);
  const nearRef = refs.some((b) => distance(b.c, b.r, u.c, u.r) <= 1);
  if (here < 3) {
    if (g.spiceAt(u.c, u.r) > 0 && u.cargo < cap) return;
    if (nearRef && u.cargo > 0) return;
  }
  const reach = g.reachable(u);
  const field = g.distanceField(u, (c, r) => danger(c, r) * 1.5);
  let target = null, bd = Infinity;
  const goHome = u.cargo >= cap - 1 || (here >= 3 && u.cargo > cap * 0.5);
  if (goHome && refs.length) {
    for (const b of refs) for (const [c, r] of neighbors(b.c, b.r, g.W, g.H)) {
      const occ = g.unitAt(c, r, false);
      if ((occ && occ !== u) || g.buildingAt(c, r)) continue;
      const d = field.d[g.i(c, r)];
      if (d < bd) { bd = d; target = [c, r]; }
    }
  }
  if (!target && u.cargo < cap) {
    for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) {
      if (g.spiceAt(c, r) <= 0) continue;
      const occ = g.unitAt(c, r, false); if (occ && occ !== u) continue;
      const d = field.d[g.i(c, r)] + danger(c, r) * 3;
      if (d < bd) { bd = d; target = [c, r]; }
    }
  }
  if (!target && here >= 2) {
    // Flucht auf Fels
    for (const [k, n] of reach) if (n.end && !g.isSand(n.c, n.r)) { const d = n.cost; if (d < bd) { bd = d; target = [n.c, n.r]; } }
  }
  if (!target) return;
  const step = g.stepToward(u, field, target[0], target[1], reach);
  if (step && (step.c !== u.c || step.r !== u.r)) await act.move(u, step.c, step.r, reach);
}

// ---------- KI-Zug ----------
export async function aiTurn(g, act, owner = 1) {
  const enemy = 1 - owner;
  aiBuild(g, owner);
  aiProduce(g, owner);

  const mine = g.ownUnits(owner);
  const myB = g.buildings.filter((b) => !b.dead && b.owner === owner);
  const home = myB.find((b) => b.type === 'bauhof') || myB[0];
  const enemyB = g.buildings.filter((b) => !b.dead && b.owner === enemy);
  const enemyU = g.units.filter((u) => !u.dead && u.owner === enemy && !u.carried);
  const threats = enemyU.filter((e) => myB.some((b) => distance(b.c, b.r, e.c, e.r) <= 6));
  const army = mine.filter((u) => g.weapon(u) && !u.def.harvester);
  const diff = g.diff || { wave: 5, firstAttack: 7 };
  const wave = diff.wave + Math.floor(g.round / 6);
  let mode = threats.length ? 'defend' : (army.length >= wave && g.round >= diff.firstAttack) ? 'attack' : 'gather';
  if (g.aiMode === 'attack' && army.length >= Math.max(2, wave * 0.4) && !threats.length) mode = 'attack';
  g.aiMode = mode;
  const enemyHome = g.map.starts[enemy];
  const stage = home ? stagingHex(g, home, enemyHome) : null;

  const order = [...army].sort((a, b) => (g.weapon(b).range[1] - g.weapon(a).range[1]));
  for (const u of order) {
    if (u.dead || g.state !== 'play') continue;
    await unitAct(g, u, act, mode, { threats, enemyB, enemyU, stage, home });
  }
  for (const u of mine) if (u.def.harvester && !u.dead) await autoHarvest(g, u, act);
}

function stagingHex(g, home, target) {
  const dc = target.c - home.c, dr = target.r - home.r, l = Math.hypot(dc, dr) || 1;
  return { c: Math.round(home.c + dc / l * 4), r: Math.round(home.r + dr / l * 4) };
}

async function unitAct(g, u, act, mode, ctx) {
  const w = g.weapon(u);
  const danger = dangerFn(g, u.owner);
  const reach = g.reachable(u);
  // Munitionslose Kampf-Thopter heim
  if (w.ammo && u.ammo <= 0) {
    const h = g.buildings.find((b) => !b.dead && b.owner === u.owner && b.type === 'horst' && b.turnsLeft <= 0);
    if (h) {
      const field = g.distanceField(u);
      const step = g.stepToward(u, field, h.c, h.r, reach);
      if (step && (step.c !== u.c || step.r !== u.r)) await act.move(u, step.c, step.r, reach);
    }
    return;
  }
  // Beste Angriffsoption über alle erreichbaren Felder
  let best = null, bs = mode === 'attack' ? -40 : 15;
  const consider = w.noMoveFire ? [[g.i(u.c, u.r), reach.get(g.i(u.c, u.r))]] : [...reach];
  for (const [k, n] of consider) {
    if (!n || !n.end) continue;
    const ts = g.targetsFrom(u, n.c, n.r, false);
    for (const t of ts) {
      const f = g.forecast(u, t, n.c, n.r);
      let s = f.dmg / 100 * value(g, t) - f.counter / 100 * value(g, u) * 0.9;
      if (f.kills) s += value(g, t) * 0.4;
      s -= danger(n.c, n.r) * 60;
      if (!g.isAir(u)) s += g.terr(n.c, n.r) === 'rock' ? 10 : g.terr(n.c, n.r) === 'mountain' ? 20 : 0;
      s -= n.cost * 2;
      if (s > bs) { bs = s; best = { n, t }; }
    }
  }
  if (best) {
    if (best.n.c !== u.c || best.n.r !== u.r) await act.move(u, best.n.c, best.n.r, reach);
    if (!u.dead && !best.t.dead) await act.attack(u, best.t);
    return;
  }
  // Ziel bestimmen
  let goal = null;
  if (mode === 'defend' && ctx.threats.length) goal = nearest(u, ctx.threats.filter((t) => !t.dead));
  else if (mode === 'attack') goal = nearest(u, ctx.enemyB.filter((b) => !b.dead)) || nearest(u, ctx.enemyU.filter((t) => !t.dead));
  else if (ctx.stage) goal = ctx.stage;
  if (!goal) return;
  const field = g.distanceField(u, (c, r) => danger(c, r) * 2);
  let tc = goal.c, tr = goal.r;
  if (field.d[g.i(tc, tr)] === Infinity) {
    // Nächstes erreichbares Feld am Ziel
    let bd = Infinity;
    for (const [c, r] of neighbors(goal.c, goal.r, g.W, g.H)) if (field.d[g.i(c, r)] < bd) { bd = field.d[g.i(c, r)]; tc = c; tr = r; }
  }
  if (mode === 'gather' && distance(u.c, u.r, tc, tr) <= 2) return;
  const step = g.stepToward(u, field, tc, tr, reach);
  if (step && (step.c !== u.c || step.r !== u.r)) {
    await act.move(u, step.c, step.r, reach);
    if (!u.dead && g.canFire(u)) {
      const ts = g.targetsFrom(u, u.c, u.r, false);
      let bt = null, b2 = 0;
      for (const t of ts) { const f = g.forecast(u, t); const s = f.dmg / 100 * value(g, t) - f.counter / 100 * value(g, u); if (s > b2) { b2 = s; bt = t; } }
      if (bt) await act.attack(u, bt);
    }
  }
}

function nearest(u, list) {
  let best = null, bd = Infinity;
  for (const e of list) { const d = distance(u.c, u.r, e.c, e.r); if (d < bd) { bd = d; best = e; } }
  return best;
}

export function aiBuild(g, owner) {
  const p = g.players[owner];
  if (!g.bauhofReady(owner)) return;
  const tally = {};
  for (const b of g.buildings) if (!b.dead && b.owner === owner) tally[b.type] = (tally[b.type] || 0) + 1;
  let want = null;
  if (p.low || p.powerProd - p.powerUse < 15) want = 'windfalle';
  else {
    const need = {};
    for (const t of PLAN) { need[t] = (need[t] || 0) + 1; if ((tally[t] || 0) < need[t]) { want = t; break; } }
  }
  if (!want) want = g.round % 2 ? 'turm' : 'windfalle';
  const def = BUILDINGS[want];
  if (!g.prereqOk(owner, def) || p.credits < def.cost) return;
  const hexes = g.buildHexes(owner, want);
  if (!hexes.length) return;
  const home = g.map.starts[owner], foe = g.map.starts[1 - owner];
  let best = null, bs = -Infinity;
  for (const [c, r] of hexes) {
    let s = -distance(c, r, home.c, home.r) * 2 + g.rnd() * 1.5;
    if (def.weapon) s = -distance(c, r, foe.c, foe.r) * 1.2 - distance(c, r, home.c, home.r) * 0.6 + g.rnd();
    if (want === 'raffinerie') { // nahe Glut
      let near = 99;
      for (let rr = 0; rr < g.H; rr++) for (let cc = 0; cc < g.W; cc++) if (g.spiceAt(cc, rr) > 0) near = Math.min(near, distance(c, r, cc, rr));
      s -= near * 3;
    }
    // Nicht alles zubauen: Nachbarn frei lassen
    const freeN = neighbors(c, r, g.W, g.H).filter(([nc, nr]) => g.groundFree(nc, nr)).length;
    s += freeN * 0.8;
    if (s > bs) { bs = s; best = [c, r]; }
  }
  if (best) g.placeBuilding(owner, want, best[0], best[1]);
}

export function aiProduce(g, owner) {
  const p = g.players[owner];
  const harvesters = g.ownUnits(owner).filter((u) => u.def.harvester).length;
  const refs = g.count(owner, 'raffinerie');
  const reserve = g.round > 3 ? 250 : 0;
  for (const b of g.buildings) {
    if (b.dead || b.owner !== owner || !b.def.produces || b.producing || b.turnsLeft > 0) continue;
    let opts = [];
    if (b.def.produces === 'veh') {
      if (refs && harvesters < Math.min(4, refs + 1) && g.prereqOk(owner, UNITS.ernter)) opts = [['ernter', 10]];
      else opts = [['panzer', 5], ['trike', 2], ['werfer', 2]];
    } else if (b.def.produces === 'inf') opts = [['inf', 3], ['rak', 2]];
    else if (b.def.produces === 'air') opts = [['falke', 3], ['libelle', 2]];
    opts = opts.filter(([t]) => g.prereqOk(owner, UNITS[t]) && p.credits >= UNITS[t].cost + (t === 'ernter' ? 0 : reserve));
    if (!opts.length) continue;
    const tot = opts.reduce((a, o) => a + o[1], 0);
    let x = g.rnd() * tot, pick = opts[0][0];
    for (const [t, wgt] of opts) { x -= wgt; if (x <= 0) { pick = t; break; } }
    g.produce(b, pick);
  }
}
