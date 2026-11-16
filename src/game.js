// Spielregeln und Zustand (rundenbasiert)
import { UNITS, BUILDINGS, WEAPONS, ARMOR_MOD, TERRAIN, MOVE_COST, FACTIONS, START_CREDITS } from './data.js';
import { neighbors, distance, ring, center } from './hex.js';
const ang = (c1, r1, c2, r2) => { const a = center(c1, r1), b = center(c2, r2); return Math.atan2(b.y - a.y, b.x - a.x); };
import { mulberry32 } from './util.js';

let NEXT = 1;

export class Game {
  constructor(map, opts = {}) {
    this.map = map; this.W = map.W; this.H = map.H;
    this.rnd = mulberry32(map.seed * 7 + 3);
    this.units = []; this.buildings = []; this.worms = [];
    this.byId = new Map();
    this.round = 1; this.current = 0;
    this.diff = opts.diff;
    this.players = [
      this.mkPlayer(0, opts.playerFaction || 'vareth'),
      this.mkPlayer(1, opts.enemyFaction || 'kordan'),
    ];
    this.players[1].incomeMult = opts.diff?.aiBonus ?? 1;
    this.visible = new Uint8Array(this.W * this.H);
    this.explored = new Uint8Array(this.W * this.H);
    this.radar = new Uint8Array(this.W * this.H);
    this.log = [];
    this.state = 'play';
    this.storm = null;
  }
  mkPlayer(id, faction) {
    return { id, faction, name: FACTIONS[faction].name, color: FACTIONS[faction].color, credits: START_CREDITS, incomeMult: 1, powerProd: 0, powerUse: 0, low: false, stats: { kills: 0, lost: 0, harvested: 0 } };
  }

  // ---------- Aufbau ----------
  setup() {
    const [s0, s1] = this.map.starts;
    for (const [o, s, sg] of [[0, s0, 1], [1, s1, -1]]) {
      this.addBuilding(o, 'bauhof', s.c, s.r, true);
      const free = ring(s.c, s.r, 2, this.W, this.H).filter(([c, r]) => this.groundFree(c, r) && this.cost('foot', c, r) < Infinity);
      free.sort((a, b) => (b[0] - a[0]) * sg + (b[1] - a[1]) * sg);
      const types = ['inf', 'inf', 'rak', 'trike'];
      types.forEach((t, i) => { const h = free[i]; if (h) this.addUnit(o, t, h[0], h[1]); });
    }
    // Sturm weit weg von den Basen beginnen
    this.storm = { c: Math.round(this.W / 2), r: 1, rad: 2, dir: 5 };
    this.storm.next = this.stormStep(this.storm);
    this.spawnWorm(); this.spawnWorm();
    this.updatePower();
    this.updateVision();
  }

  say(text, kind = 'info', owner = 0) { if (owner === 0) { this.log.push({ text, kind, round: this.round, t: performance.now() }); if (this.log.length > 40) this.log.shift(); } }

  // ---------- Hilfen ----------
  i(c, r) { return r * this.W + c; }
  in(c, r) { return c >= 0 && r >= 0 && c < this.W && r < this.H; }
  terr(c, r) { return this.map.ter[this.i(c, r)]; }
  isSand(c, r) { return TERRAIN[this.terr(c, r)].sand; }
  spiceAt(c, r) { return this.map.spice[this.i(c, r)]; }
  get(id) { const e = this.byId.get(id); return e && !e.dead ? e : null; }
  cost(mt, c, r) { return MOVE_COST[mt][this.terr(c, r)]; }
  unitAt(c, r, air) { return this.units.find((u) => !u.dead && !u.carried && u.c === c && u.r === r && (u.def.mt === 'air') === !!air) || null; }
  buildingAt(c, r) { return this.buildings.find((b) => !b.dead && b.c === c && b.r === r) || null; }
  groundFree(c, r) { return !this.unitAt(c, r, false) && !this.buildingAt(c, r); }
  inStorm(c, r, s = this.storm) { return s && distance(c, r, s.c, s.r) <= s.rad; }
  stormNext(c, r) { return this.storm && distance(c, r, this.storm.next.c, this.storm.next.r) <= this.storm.rad; }
  wormNear(c, r, d = 3) { return this.worms.some((w) => distance(c, r, w.c, w.r) <= d); }
  has(owner, type, done = true) { return this.buildings.some((b) => !b.dead && b.owner === owner && b.type === type && (!done || b.turnsLeft <= 0)); }
  count(owner, type) { return this.buildings.filter((b) => !b.dead && b.owner === owner && b.type === type && b.turnsLeft <= 0).length; }
  prereqOk(owner, def) { return !def.prereq || def.prereq.every((t) => this.has(owner, t)); }
  ownUnits(o) { return this.units.filter((u) => !u.dead && u.owner === o); }

  addUnit(owner, type, c, r) {
    const def = UNITS[type];
    const u = { id: NEXT++, isUnit: true, owner, type, def, c, r, hp: 100, moved: false, acted: false, ammo: def.ammo || 0, cargo: 0, carrying: 0, carried: false, auto: !!def.harvester, facing: owner === 0 ? 0.5 : 3.6, vib: 0, harvested: false };
    this.units.push(u); this.byId.set(u.id, u);
    return u;
  }
  addBuilding(owner, type, c, r, instant = false) {
    const def = BUILDINGS[type];
    const b = { id: NEXT++, isBuilding: true, owner, type, def, c, r, hp: def.hp, maxHp: def.hp, turnsLeft: instant ? 0 : def.turns, producing: null, acted: false, usedRound: 0, facing: owner === 0 ? 0.8 : 3.9, rise: instant ? 1 : 0 };
    this.buildings.push(b); this.byId.set(b.id, b);
    this.updatePower();
    return b;
  }

  // ---------- Strom ----------
  updatePower() {
    for (const p of this.players) {
      let prod = 0, use = 0;
      for (const b of this.buildings) {
        if (b.dead || b.owner !== p.id || b.turnsLeft > 0) continue;
        if (b.def.power > 0) prod += b.def.power * (b.hp < b.maxHp * 0.5 ? 0.5 : 1); else use -= b.def.power;
      }
      const was = p.low;
      p.powerProd = Math.round(prod); p.powerUse = use; p.low = use > prod;
      if (p.low && !was) this.say('Energie niedrig — Produktion und Abwehr stehen still', 'warn', p.id);
    }
  }

  // ---------- Bewegung ----------
  blocked(u, c, r) {
    // Kann u dieses Feld betreten (durchqueren)?
    const air = u.def.mt === 'air';
    if (this.inStorm(c, r) && !(c === u.c && r === u.r)) return true;
    if (!air) { const b = this.buildingAt(c, r); if (b) return true; }
    const o = this.unitAt(c, r, air);
    if (o && o.owner !== u.owner) return true;
    if (!air) { const w = this.worms.find((w) => w.surfaced && w.c === c && w.r === r); if (w) return true; }
    return false;
  }

  reachable(u, budget = u.def.move) {
    const res = new Map();
    const key = (c, r) => r * this.W + c;
    res.set(key(u.c, u.r), { c: u.c, r: u.r, cost: 0, prev: null });
    const open = [[u.c, u.r, 0]];
    while (open.length) {
      open.sort((a, b) => a[2] - b[2]);
      const [c, r, g] = open.shift();
      if (g > (res.get(key(c, r))?.cost ?? Infinity)) continue;
      for (const [nc, nr] of neighbors(c, r, this.W, this.H)) {
        const k = key(nc, nr);
        const step = this.cost(u.def.mt, nc, nr);
        if (step === Infinity || this.blocked(u, nc, nr)) continue;
        const ng = g + step;
        if (ng > budget) continue;
        const cur = res.get(k);
        if (!cur || ng < cur.cost) { res.set(k, { c: nc, r: nr, cost: ng, prev: key(c, r) }); open.push([nc, nr, ng]); }
      }
    }
    // Endfelder: nicht von eigenen Einheiten besetzt
    for (const [k, v] of res) {
      const occ = this.unitAt(v.c, v.r, u.def.mt === 'air');
      v.end = !occ || occ === u;
    }
    return res;
  }

  pathFrom(reach, c, r) {
    const path = [];
    let k = r * this.W + c;
    while (k !== null && k !== undefined) { const n = reach.get(k); if (!n) break; path.push({ c: n.c, r: n.r }); k = n.prev; }
    return path.reverse();
  }

  // Dijkstra über die ganze Karte (ignoriert eigene Einheiten) — für KI/Auto-Ernter
  distanceField(u, avoid) {
    const W = this.W, d = new Float32Array(W * this.H).fill(Infinity), prev = new Int32Array(W * this.H).fill(-1);
    d[this.i(u.c, u.r)] = 0;
    const open = [[u.c, u.r, 0]];
    while (open.length) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][2] < open[bi][2]) bi = k;
      const [c, r, g] = open.splice(bi, 1)[0];
      if (g > d[this.i(c, r)]) continue;
      for (const [nc, nr] of neighbors(c, r, W, this.H)) {
        let step = this.cost(u.def.mt, nc, nr);
        if (step === Infinity) continue;
        if (u.def.mt !== 'air' && this.buildingAt(nc, nr)) continue;
        const o = this.unitAt(nc, nr, u.def.mt === 'air'); if (o && o.owner !== u.owner) step += 6;
        if (avoid) step += avoid(nc, nr);
        const ng = g + step, k = this.i(nc, nr);
        if (ng < d[k]) { d[k] = ng; prev[k] = this.i(c, r); open.push([nc, nr, ng]); }
      }
    }
    return { d, prev };
  }

  // Schritt Richtung Ziel innerhalb der Reichweite
  stepToward(u, field, tc, tr, reach = this.reachable(u)) {
    const W = this.W;
    let k = this.i(tc, tr);
    if (field.d[k] === Infinity) return null;
    const chain = [];
    while (k !== -1) { chain.push(k); k = field.prev[k]; }
    // vom Ziel zurück: erstes Feld, das erreichbar und frei ist
    for (const kk of chain) { const n = reach.get(kk); if (n && n.end) return { c: n.c, r: n.r }; }
    return null;
  }

  moveUnit(u, c, r, reach) {
    const path = this.pathFrom(reach || this.reachable(u), c, r);
    if (path.length > 1) {
      const a = path[path.length - 2];
      u.facing = ang(a.c, a.r, c, r);
    }
    u.c = c; u.r = r; u.moved = true;
    const carried = this.get(u.carrying); if (carried) { carried.c = c; carried.r = r; }
    return path;
  }

  // ---------- Kampf ----------
  weapon(e) { return WEAPONS[e.def.weapon] || null; }
  isAir(e) { return e.isUnit && e.def.mt === 'air'; }
  canHit(w, t) { return !!w && (this.isAir(t) ? w.air : w.ground); }
  inRange(w, c1, r1, c2, r2) { const d = distance(c1, r1, c2, r2); return d >= w.range[0] && d <= w.range[1]; }

  canFire(u) {
    const w = this.weapon(u); if (!w || u.acted || u.carried) return false;
    if (w.noMoveFire && u.moved) return false;
    if (w.ammo && u.ammo <= 0) return false;
    if (u.isBuilding && (u.turnsLeft > 0 || this.players[u.owner].low)) return false;
    return true;
  }

  targetsFrom(e, c, r, onlyVisible = e.owner === 0) {
    const w = this.weapon(e); if (!w) return [];
    const out = [];
    for (const t of this.units) {
      if (t.dead || t.carried || t.owner === e.owner || !this.canHit(w, t)) continue;
      if (onlyVisible && !this.visible[this.i(t.c, t.r)]) continue;
      if (this.inRange(w, c, r, t.c, t.r)) out.push(t);
    }
    if (w.ground) for (const b of this.buildings) {
      if (b.dead || b.owner === e.owner) continue;
      if (onlyVisible && !this.explored[this.i(b.c, b.r)]) continue;
      if (this.inRange(w, c, r, b.c, b.r)) out.push(b);
    }
    return out;
  }

  calcDamage(att, t, attHp = att.hp, fromC = att.c, fromR = att.r) {
    const w = this.weapon(att); if (!w || !this.canHit(w, t)) return 0;
    const armor = t.isBuilding ? 'bld' : t.def.armor;
    const mod = ARMOR_MOD[w.type][armor] ?? 0;
    const hpF = att.isBuilding ? 1 : 0.35 + 0.65 * (attHp / 100);
    const def = t.isBuilding || this.isAir(t) ? 0 : TERRAIN[this.terr(t.c, t.r)].def;
    let dmg = w.power * mod * hpF * (1 - def);
    if (t.isBuilding) dmg = dmg * t.maxHp / 100; // Gebäude-TP skalieren
    return dmg;
  }

  hpPct(e) { return e.isBuilding ? (e.hp / e.maxHp) * 100 : e.hp; }

  forecast(att, t, fromC = att.c, fromR = att.r) {
    const dmg = this.calcDamage(att, t);
    const tHpAfter = Math.max(0, t.hp - dmg);
    let counter = 0;
    if (tHpAfter > 0 && this.canCounter(t, att, fromC, fromR)) {
      const tHpPct = t.isBuilding ? (tHpAfter / t.maxHp) * 100 : tHpAfter;
      counter = this.calcDamage(t, att, tHpPct) * 0.85;
    }
    const pct = (v, e) => (e.isBuilding ? (v / e.maxHp) * 100 : v);
    return { dmg: pct(dmg, t), counter: pct(counter, att), kills: tHpAfter <= 0 };
  }

  canCounter(t, att, ac = att.c, ar = att.r) {
    const w = this.weapon(t); if (!w || w.noCounter || !this.canHit(w, att)) return false;
    if (t.isBuilding && (t.turnsLeft > 0 || this.players[t.owner].low)) return false;
    if (w.ammo && t.ammo <= 0) return false;
    return this.inRange(w, t.c, t.r, ac, ar);
  }

  attack(att, t) {
    const w = this.weapon(att);
    const rnd = 0.92 + this.rnd() * 0.16;
    const dmg = this.calcDamage(att, t) * rnd;
    t.hp -= dmg;
    att.acted = true; att.moved = true;
    if (w.ammo) att.ammo--;
    att.facing = ang(att.c, att.r, t.c, t.r);
    const ev = { type: 'attack', att: att.id, target: t.id, dmg: this.pct(dmg, t), proj: w.proj, counter: 0, killed: false, counterKilled: false };
    if (t.hp <= 0.5) { ev.killed = true; this.kill(t, att); }
    else if (this.canCounter(t, att)) {
      const cw = this.weapon(t);
      const cd = this.calcDamage(t, att, this.hpPct(t)) * 0.85 * (0.92 + this.rnd() * 0.16);
      att.hp -= cd; ev.counter = this.pct(cd, att); ev.counterProj = cw.proj;
      if (cw.ammo) t.ammo--;
      if (att.hp <= 0.5) { ev.counterKilled = true; this.kill(att, t); }
    }
    return ev;
  }
  pct(v, e) { return e.isBuilding ? (v / e.maxHp) * 100 : v; }

  kill(e, by) {
    if (e.dead) return;
    e.dead = true; e.hp = 0;
    if (by) this.players[by.owner].stats.kills++;
    this.players[e.owner].stats.lost++;
    if (e.isUnit) {
      const c = this.get(e.carrying); if (c) this.kill(c, by);
      if (e.def.harvester && e.cargo > 0 && this.isSand(e.c, e.r)) this.map.spice[this.i(e.c, e.r)] += e.cargo;
      this.say(`${e.def.name} verloren`, 'bad', e.owner);
    } else {
      this.say(`${e.def.name} zerstört`, 'bad', e.owner);
      this.updatePower();
    }
  }

  // ---------- Bauen und Produktion ----------
  bauhofReady(owner) {
    const b = this.buildings.find((x) => !x.dead && x.owner === owner && x.type === 'bauhof');
    return b && b.usedRound !== this.round ? b : null;
  }
  buildHexes(owner, type) {
    const out = [];
    for (let r = 0; r < this.H; r++) for (let c = 0; c < this.W; c++) if (this.canPlace(owner, type, c, r)) out.push([c, r]);
    return out;
  }
  canPlace(owner, type, c, r) {
    if (this.terr(c, r) !== 'rock' || !this.groundFree(c, r) || this.inStorm(c, r)) return false;
    return this.buildings.some((b) => !b.dead && b.owner === owner && distance(b.c, b.r, c, r) <= 2);
  }
  placeBuilding(owner, type, c, r) {
    const def = BUILDINGS[type], p = this.players[owner];
    const bh = this.bauhofReady(owner);
    if (!bh || !this.prereqOk(owner, def) || p.credits < def.cost || !this.canPlace(owner, type, c, r)) return null;
    p.credits -= def.cost; bh.usedRound = this.round;
    const b = this.addBuilding(owner, type, c, r);
    this.say(`${def.name} wird errichtet (${def.turns} ${def.turns === 1 ? 'Runde' : 'Runden'})`, 'info', owner);
    return b;
  }
  canProduce(b, type) {
    const def = UNITS[type], p = this.players[b.owner];
    return b.turnsLeft <= 0 && !b.producing && b.def.produces === def.cat && this.prereqOk(b.owner, def) && p.credits >= def.cost && !p.low;
  }
  produce(b, type) {
    if (!this.canProduce(b, type)) return false;
    this.players[b.owner].credits -= UNITS[type].cost;
    b.producing = type;
    return true;
  }
  cancelProduce(b) { if (b.producing) { this.players[b.owner].credits += UNITS[b.producing].cost; b.producing = null; } }

  spawnNear(owner, type, c, r) {
    const air = UNITS[type].mt === 'air';
    if (air && !this.unitAt(c, r, true)) return this.addUnit(owner, type, c, r);
    const cands = ring(c, r, 2, this.W, this.H).sort((a, b) => distance(c, r, a[0], a[1]) - distance(c, r, b[0], b[1]));
    for (const [nc, nr] of cands) {
      if (air ? this.unitAt(nc, nr, true) : (!this.groundFree(nc, nr) || this.cost(UNITS[type].mt, nc, nr) === Infinity)) continue;
      return this.addUnit(owner, type, nc, nr);
    }
    return null;
  }

  // Rundenbeginn eines Spielers: Bauten fertig, Einheiten erscheinen, Aktionen zurücksetzen
  beginTurn(owner) {
    const ev = [];
    this.current = owner;
    if (this.round > 1) for (const b of this.buildings) if (!b.dead && b.owner === owner && b.type === 'bauhof') { const amt = Math.round(100 * this.players[owner].incomeMult); this.players[owner].credits += amt; ev.push({ type: 'income', amount: amt, owner }); }
    for (const b of this.buildings) {
      if (b.dead || b.owner !== owner) continue;
      b.acted = false;
      if (b.turnsLeft > 0) {
        b.turnsLeft--;
        if (b.turnsLeft === 0) {
          this.say(`${b.def.name} fertig`, 'good', owner);
          ev.push({ type: 'built', b: b.id });
          if (b.def.freeUnit) { const u = this.spawnNear(owner, b.def.freeUnit, b.c, b.r); if (u) ev.push({ type: 'spawn', u: u.id }); }
        }
      }
      if (b.producing && b.turnsLeft <= 0) {
        const u = this.spawnNear(owner, b.producing, b.c, b.r);
        if (u) { ev.push({ type: 'spawn', u: u.id }); this.say(`${u.def.name} bereit`, 'good', owner); b.producing = null; }
        else this.say(`${b.def.name}: kein Platz zum Ausrücken`, 'warn', owner);
      }
    }
    for (const u of this.units) {
      if (u.dead || u.owner !== owner) continue;
      u.moved = false; u.acted = false; u.harvested = false;
      if (u.def.ammo && u.ammo < u.def.ammo) {
        const h = this.buildings.find((b) => !b.dead && b.owner === owner && b.type === 'horst' && b.turnsLeft <= 0 && distance(b.c, b.r, u.c, u.r) <= 1);
        if (h) { u.ammo = u.def.ammo; ev.push({ type: 'rearm', u: u.id }); }
      }
    }
    this.updatePower();
    return ev;
  }

  // Rundenende eines Spielers: Abwehr feuert, Ernter ernten/entladen
  endTurnEvents(owner) {
    const ev = [];
    const p = this.players[owner];
    for (const b of this.buildings) {
      if (b.dead || b.owner !== owner || !b.def.weapon || !this.canFire(b)) continue;
      const ts = this.targetsFrom(b, b.c, b.r, false).filter((t) => owner !== 0 || this.visible[this.i(t.c, t.r)]);
      if (!ts.length) continue;
      ts.sort((a, b2) => this.calcDamage(b, b2) / Math.max(1, b2.hp) - this.calcDamage(b, a) / Math.max(1, a.hp));
      ev.push(this.attack(b, ts[0]));
    }
    for (const u of this.units) {
      if (u.dead || u.owner !== owner) continue;
      // Vibration für Würmer
      const sand = this.isSand(u.c, u.r) && !u.carried && u.def.mt !== 'air';
      u.vib = 0;
      if (!u.def.harvester) continue;
      const sp = this.spiceAt(u.c, u.r);
      if (sp > 0 && u.cargo < u.def.capacity && !u.carried) {
        const take = Math.min(u.def.rate, sp, u.def.capacity - u.cargo);
        this.map.spice[this.i(u.c, u.r)] -= take; u.cargo += take; u.harvested = true;
        ev.push({ type: 'harvest', u: u.id, amount: take });
      }
      const ref = this.buildings.find((b) => !b.dead && b.owner === owner && b.type === 'raffinerie' && b.turnsLeft <= 0 && distance(b.c, b.r, u.c, u.r) <= 1);
      if (ref && u.cargo > 0 && !u.carried) {
        const amt = Math.round(u.cargo * p.incomeMult);
        p.credits += amt; p.stats.harvested += u.cargo; u.cargo = 0;
        ev.push({ type: 'unload', u: u.id, amount: amt, ref: ref.id });
      }
    }
    for (const u of this.units) {
      if (u.dead || u.owner !== owner || u.carried || u.def.mt === 'air' || !this.isSand(u.c, u.r)) { if (!u.dead) u.vib = 0; continue; }
      const veh = u.def.cat === 'veh';
      u.vib = u.harvested ? 3 : u.moved ? (veh ? 2 : 1) : (veh ? 0.6 : 0.15);
    }
    return ev;
  }

  // ---------- Thopter-Transport ----------
  canPickup(carrier, t) {
    return carrier.def.carrier && !carrier.carrying && !carrier.acted && t && !t.acted && t.isUnit !== undefined && t.isUnit && t.owner === carrier.owner && t.def.mt !== 'air' && !t.carried && distance(carrier.c, carrier.r, t.c, t.r) <= 1;
  }
  pickup(carrier, t) {
    carrier.carrying = t.id; t.carried = true; t.c = carrier.c; t.r = carrier.r; t.moved = true; t.acted = true;
    if (carrier.moved) carrier.acted = true; // vor dem Flug aufgenommen: darf danach noch fliegen
    return { type: 'pickup', u: carrier.id, t: t.id };
  }
  dropHexes(carrier) {
    const t = this.get(carrier.carrying); if (!t) return [];
    const cands = [[carrier.c, carrier.r], ...neighbors(carrier.c, carrier.r, this.W, this.H)];
    return cands.filter(([c, r]) => this.groundFree(c, r) && this.cost(t.def.mt, c, r) < Infinity && !this.inStorm(c, r));
  }
  drop(carrier, c, r) {
    const t = this.get(carrier.carrying); if (!t) return null;
    t.carried = false; t.c = c; t.r = r; carrier.carrying = 0; carrier.acted = true; carrier.moved = true;
    return { type: 'drop', u: carrier.id, t: t.id };
  }

  // ---------- Weltphase ----------
  stormStep(s) {
    let dir = s.dir;
    if (this.rnd() < 0.35) dir = (dir + (this.rnd() < 0.5 ? 1 : 5)) % 6;
    let c = s.c, r = s.r;
    for (let k = 0; k < 2; k++) {
      let nb = neighbors(c, r, this.W, this.H);
      const order = [dir, (dir + 1) % 6, (dir + 5) % 6, (dir + 2) % 6, (dir + 4) % 6, (dir + 3) % 6];
      // Richtungsindex wie in hex.js-Tabellen
      const t = r & 1 ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]] : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
      let moved = false;
      for (const d of order) {
        const nc = c + t[d][0], nr = r + t[d][1];
        if (nc >= 1 && nr >= 1 && nc < this.W - 1 && nr < this.H - 1 && this.map.starts.every((st) => distance(nc, nr, st.c, st.r) >= 5)) { c = nc; r = nr; dir = d; moved = true; break; }
      }
      if (!moved) break;
    }
    return { c, r, dir };
  }

  worldPhase() {
    const ev = [];
    // 1. Sturm
    const s = this.storm;
    const from = { c: s.c, r: s.r };
    s.c = s.next.c; s.r = s.next.r; s.dir = s.next.dir;
    s.next = this.stormStep(s);
    const hits = [];
    for (const [c, r] of ring(s.c, s.r, s.rad, this.W, this.H)) {
      const i = this.i(c, r);
      if (this.map.spice[i] > 0) this.map.spice[i] = Math.floor(this.map.spice[i] * 0.5);
      for (const u of this.units) {
        if (u.dead || u.carried || u.c !== c || u.r !== r) continue;
        const t = this.terr(c, r);
        const dmg = u.def.mt === 'air' ? 55 : t === 'mountain' ? 0 : t === 'rock' ? 15 : 45;
        if (dmg) { u.hp -= dmg; hits.push({ id: u.id, dmg }); if (u.hp <= 0.5) this.kill(u); }
      }
      const b = this.buildingAt(c, r);
      if (b) { const d = b.maxHp * 0.12; b.hp -= d; hits.push({ id: b.id, dmg: 12 }); if (b.hp <= 0) this.kill(b); }
    }
    ev.push({ type: 'storm', from, to: { c: s.c, r: s.r }, hits });
    if (hits.some((h) => { const e = this.byId.get(h.id); return e && e.owner === 0; })) this.say('Der Sturm trifft eure Einheiten!', 'bad');

    // 2. Würmer
    for (const w of this.worms) ev.push(...this.wormTurn(w));

    // 3. Glutausbruch
    if (this.round % 4 === 0) {
      for (let tries = 0; tries < 60; tries++) {
        const c = 2 + Math.floor(this.rnd() * (this.W - 4)), r = 2 + Math.floor(this.rnd() * (this.H - 4));
        if (!this.isSand(c, r) || this.map.starts.some((st) => distance(c, r, st.c, st.r) < 5) || this.inStorm(c, r)) continue;
        for (const [nc, nr] of ring(c, r, 1, this.W, this.H)) if (this.isSand(nc, nr)) this.map.spice[this.i(nc, nr)] += 300 + Math.round(this.rnd() * 300);
        let worm = null;
        if (this.worms.length < 3 && this.rnd() < 0.6) worm = this.spawnWorm(c, r);
        ev.push({ type: 'blow', c, r, worm: worm?.id });
        this.say(this.explored[this.i(c, r)] ? 'Glutausbruch! Neues Feld in der Wüste' : 'Glutausbruch irgendwo in der Wüste', 'good');
        break;
      }
    }
    this.round++;
    this.updatePower();
    return ev;
  }

  spawnWorm(c, r) {
    if (c === undefined) {
      for (let k = 0; k < 200; k++) {
        const cc = Math.floor(this.rnd() * this.W), rr = Math.floor(this.rnd() * this.H);
        if (this.isSand(cc, rr) && this.map.starts.every((s) => distance(cc, rr, s.c, s.r) > 8)) { c = cc; r = rr; break; }
      }
      if (c === undefined) return null;
    }
    const w = { id: NEXT++, isWorm: true, c, r, sated: 1, surfaced: false, facing: 0 };
    this.worms.push(w); this.byId.set(w.id, w);
    return w;
  }

  wormTurn(w) {
    const ev = [];
    const sandPass = (c, r) => this.isSand(c, r) && !this.buildingAt(c, r);
    let best = null, bs = 0;
    if (w.sated <= 0) {
      for (const u of this.units) {
        if (u.dead || u.carried || u.def.mt === 'air' || !this.isSand(u.c, u.r)) continue;
        const d = distance(w.c, w.r, u.c, u.r);
        if (d > 9) continue;
        const s = u.vib / (1 + d * 0.35);
        if (s > bs) { bs = s; best = u; }
      }
    } else w.sated--;
    const path = [{ c: w.c, r: w.r }];
    if (best && bs > 0.12) {
      // BFS über Sand zum Ziel, max. 5 Schritte
      const prev = new Map(), q = [[w.c, w.r]], key = (c, r) => r * this.W + c;
      prev.set(key(w.c, w.r), null);
      let found = false;
      while (q.length && !found) {
        const [c, r] = q.shift();
        for (const [nc, nr] of neighbors(c, r, this.W, this.H)) {
          const k = key(nc, nr);
          if (prev.has(k) || !sandPass(nc, nr)) continue;
          prev.set(k, key(c, r)); q.push([nc, nr]);
          if (nc === best.c && nr === best.r) { found = true; break; }
        }
      }
      if (found) {
        const chain = []; let k = key(best.c, best.r);
        while (k !== null) { chain.push({ c: k % this.W, r: Math.floor(k / this.W) }); k = prev.get(k); }
        chain.reverse();
        const steps = chain.slice(1, 6);
        path.push(...steps);
        const last = steps[steps.length - 1];
        w.c = last.c; w.r = last.r;
        if (last.c === best.c && last.r === best.r) {
          this.kill(best);
          w.sated = 3;
          ev.push({ type: 'worm', id: w.id, path, eat: best.id, owner: best.owner });
          if (best.owner === 0) this.say(`Ein Wurm hat euren ${best.def.name} verschlungen!`, 'bad');
          return ev;
        }
      }
    }
    if (path.length === 1) {
      // Umherziehen
      let c = w.c, r = w.r;
      for (let k = 0; k < 2; k++) {
        const nb = neighbors(c, r, this.W, this.H).filter(([nc, nr]) => sandPass(nc, nr));
        if (!nb.length) break;
        [c, r] = nb[Math.floor(this.rnd() * nb.length)];
        path.push({ c, r });
      }
      w.c = c; w.r = r;
    }
    ev.push({ type: 'worm', id: w.id, path });
    const near = this.units.some((u) => !u.dead && u.owner === 0 && !u.carried && u.def.mt !== 'air' && this.isSand(u.c, u.r) && distance(u.c, u.r, w.c, w.r) <= 3);
    if (near && this.wormSeen(w)) this.say('Wurmzeichen! Einheiten auf Fels bringen', 'warn');
    return ev;
  }

  wormSeen(w) { return !!(this.visible[this.i(w.c, w.r)] || this.radar[this.i(w.c, w.r)]); }

  // ---------- Sicht ----------
  updateVision() {
    this.visible.fill(0); this.radar.fill(0);
    const reveal = (c, r, rad, arr = this.visible) => { for (const [x, y] of ring(c, r, rad, this.W, this.H)) arr[this.i(x, y)] = 1; };
    for (const u of this.units) if (!u.dead && u.owner === 0 && !u.carried) reveal(u.c, u.r, u.def.sight);
    for (const b of this.buildings) if (!b.dead && b.owner === 0) {
      reveal(b.c, b.r, b.def.sight);
      if (b.def.radar && b.turnsLeft <= 0 && !this.players[0].low) reveal(b.c, b.r, 9, this.radar);
    }
    for (let k = 0; k < this.visible.length; k++) if (this.visible[k]) this.explored[k] = 1;
  }
  seen(e) {
    if (e.owner === 0) return true;
    if (e.isBuilding) return !!this.explored[this.i(e.c, e.r)];
    return !!this.visible[this.i(e.c, e.r)];
  }

  checkEnd() {
    const alive = (o) => this.buildings.some((b) => !b.dead && b.owner === o);
    if (!alive(1)) this.state = 'won';
    else if (!alive(0) && !this.units.some((u) => !u.dead && u.owner === 0)) this.state = 'lost';
    return this.state;
  }

  cleanup() {
    this.units = this.units.filter((u) => !u.dead);
    this.buildings = this.buildings.filter((b) => !b.dead);
  }
}
