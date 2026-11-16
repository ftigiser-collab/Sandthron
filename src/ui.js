// Steuerung: Eingabe, Auswahl, Menüs, Animationen, Rundenablauf
import { UNITS, BUILDINGS, WEAPONS, TERRAIN, MOVE_COST } from './data.js';
import { center, pixelToHex, distance, R } from './hex.js';
import { icon } from './sprites.js';
import { angDiff } from './util.js';
import { aiTurn, autoHarvest } from './ai.js';

const $ = (s) => document.querySelector(s);
const ARMOR_NAME = { inf: 'Infanterie', light: 'Leicht', heavy: 'Schwer', air: 'Luft', bld: 'Gebäude' };
const MT_NAME = { foot: 'zu Fuß', wheel: 'Räder', track: 'Ketten', air: 'Flug' };

export class Controller {
  constructor(game, renderer, fx) {
    this.g = game; this.r = renderer; this.fx = fx;
    this.sel = null; this.mode = 'idle'; this.busy = false;
    this.tweens = [];
    this.reach = null; this.afterMove = new Map();
    this.pointers = new Map();
    this.speed = 1;
    this.actAnimated = {
      move: (u, c, r, reach) => this.doMove(u, c, r, reach, u.owner !== 0),
      attack: (u, t) => this.doAttack(u, t),
    };
    this.bindInput();
    this.bindDom();
    this.refresh();
  }

  // ---------- Animation ----------
  update(dt) {
    const keep = [];
    for (const tw of this.tweens) { tw.t += dt * this.speed; const done = tw.step(Math.min(1, tw.t / tw.dur), dt); if (tw.t >= tw.dur || done) { tw.step(1, 0); tw.resolve(); } else keep.push(tw); }
    this.tweens = keep;
    this.r.projectiles = this.projectiles;
    this.updateLog();
    this.minimapT = (this.minimapT || 0) - dt;
    if (this.minimapT <= 0) { this.minimapT = 0.25; this.drawMinimap(); }
  }
  tween(dur, step) { return new Promise((resolve) => this.tweens.push({ t: 0, dur, step, resolve })); }
  wait(s) { return this.tween(s, () => {}); }

  async animMove(u, path) {
    if (path.length < 2) return;
    const pts = path.map((h) => center(h.c, h.r));
    const segT = u.def.mt === 'air' ? 0.09 : u.def.cat === 'inf' ? 0.2 : 0.14;
    u.anim = true;
    const sand = (h) => this.g.isSand(h.c, h.r);
    await this.tween(segT * (pts.length - 1), (k) => {
      const f = k * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), l = f - i;
      const a = pts[i], b = pts[i + 1];
      u.vis = { x: a.x + (b.x - a.x) * l, y: a.y + (b.y - a.y) * l };
      u.facing = Math.atan2(b.y - a.y, b.x - a.x);
      if (u.def.mt !== 'air' && u.def.cat === 'veh' && sand(path[i + 1]) && Math.random() < 0.5) this.fx.dust(u.vis.x - Math.cos(u.facing) * 12, u.vis.y - Math.sin(u.facing) * 12, 1, '205,160,100', 6, 4);
      if (u.def.mt === 'air' && sand(path[i + 1]) && Math.random() < 0.15) this.fx.dust(u.vis.x, u.vis.y, 1, '210,170,110', 14, 5);
      if (u.def.cat === 'inf' && Math.random() < 0.08) this.fx.dust(u.vis.x, u.vis.y + 4, 1, '190,150,100', 8, 2);
      const c = u.carrying && this.g.get(u.carrying); if (c) c.vis = u.vis;
    });
    u.vis = null; u.anim = false;
    const c = u.carrying && this.g.get(u.carrying); if (c) c.vis = null;
  }

  shotVisual(a, t, proj) {
    const pa = this.r.posOf(a), pt = this.r.posOf(t);
    const az = a.isUnit && a.def.mt === 'air' ? 26 : 0, tz = t.isUnit && t.def.mt === 'air' ? 26 : 0;
    const sx = pa.x, sy = pa.y - az, tx = pt.x + (Math.random() - 0.5) * 10, ty = pt.y - tz + (Math.random() - 0.5) * 10;
    const fx = this.fx;
    const team = a.owner === 0 ? '170,215,255' : '255,190,150';
    if (proj === 'bullet') {
      return this.tween(0.45, (k, dt) => {
        if (Math.random() < dt * 22) {
          const jx = (Math.random() - 0.5) * 16, jy = (Math.random() - 0.5) * 16;
          fx.tracer(sx, sy, tx + jx, ty + jy, team); fx.flash(sx, sy, 7, '255,230,160', 0.05);
          if (Math.random() < 0.6) fx.spark(tx + jx, ty + jy, 2, '255,230,170', 60);
        }
      }).then(() => fx.dust(tx, ty, 3, '170,150,120', 10, 4));
    }
    if (proj === 'flak') {
      return this.tween(0.5, (k, dt) => {
        if (Math.random() < dt * 9) { const jx = (Math.random() - 0.5) * 26, jy = (Math.random() - 0.5) * 26; fx.flash(tx + jx, ty + jy, 14, '255,210,140', 0.15); fx.smoke(tx + jx, ty + jy, 2, 4, 0.9); fx.flash(sx, sy, 9, '255,220,150', 0.05); }
      });
    }
    const p = { kind: proj === 'arty' ? 'arty' : proj, x: sx, y: sy, h: 0, ang: Math.atan2(ty - sy, tx - sx) };
    this.projectiles = this.projectiles || [];
    this.projectiles.push(p);
    const d = Math.hypot(tx - sx, ty - sy);
    const dur = proj === 'arty' ? 0.75 : proj === 'rocket' ? 0.18 + d / 420 : 0.1 + d / 650;
    fx.flash(sx, sy, proj === 'shell' ? 16 : 10, '255,200,120', 0.08);
    if (proj === 'shell') fx.smoke(sx, sy, 2, 4, 0.9);
    return this.tween(dur, (k) => {
      const kk = proj === 'rocket' ? k * k : k;
      p.x = sx + (tx - sx) * kk; p.y = sy + (ty - sy) * kk;
      p.h = proj === 'arty' ? Math.sin(Math.PI * k) * (50 + d * 0.15) : 0;
      if (proj === 'arty') { const k2 = Math.min(1, k + 0.02), nh = Math.sin(Math.PI * k2) * (50 + d * 0.15); p.ang = Math.atan2((ty - sy) * 0.02 - (nh - p.h), (tx - sx) * 0.02); }
      if ((proj === 'rocket' || proj === 'arty') && Math.random() < 0.9) fx.add({ kind: 'puff', x: p.x, y: p.y - p.h, life: 0.7, size: 2.5, grow: 9, col: '210,200,190', a: 0.4, air: true });
    }).then(() => {
      this.projectiles = this.projectiles.filter((q) => q !== p);
      fx.explosion(tx, ty, proj === 'arty' ? 0.9 : 0.5);
    });
  }

  async animAttack(ev) {
    const g = this.g;
    const a = g.byId.get(ev.att), t = g.byId.get(ev.target);
    if (!a || !t) return;
    const visible = g.seen(a) || g.seen(t) || a.owner === 0 || t.owner === 0;
    if (!visible) { if (ev.killed) t.gone = true; if (ev.counterKilled) a.gone = true; return; }
    const pt = this.r.posOf(t);
    this.ensureVisible(pt.x, pt.y);
    const pa = this.r.posOf(a);
    await this.aimAt(a, Math.atan2(pt.y - pa.y, pt.x - pa.x));
    this.kick(a, ev.proj);
    await this.shotVisual(a, t, ev.proj);
    this.hitFlash(t);
    this.r.float(pt.x, pt.y - (t.isUnit && t.def.mt === 'air' ? 26 : 0), `-${Math.round(ev.dmg)}`, '#ff8a6a', ev.dmg > 40);
    if (ev.killed) { await this.wait(0.1); await this.finishKill(t, true); await this.wait(0.3); }
    else if (ev.counter > 0 || ev.counterKilled) {
      await this.wait(0.12);
      await this.aimAt(t, Math.atan2(pa.y - pt.y, pa.x - pt.x));
      this.kick(t, ev.counterProj);
      await this.shotVisual(t, a, ev.counterProj);
      this.hitFlash(a);
      this.r.float(pa.x, pa.y - (a.isUnit && a.def.mt === 'air' ? 26 : 0), `-${Math.round(ev.counter)}`, '#ffb36a');
      if (ev.counterKilled) { await this.wait(0.1); await this.finishKill(a, true); await this.wait(0.3); }
    }
    await this.wait(0.15);
  }

  async aimAt(a, ang) {
    const turret = a.isUnit && (a.type === 'panzer' || a.type === 'werfer');
    if (turret) {
      const from = a.turretRel || 0, to = angDiff(a.facing, ang), d = angDiff(from, to);
      a.aimUntil = this.r.t + 4;
      if (Math.abs(d) > 0.05) await this.tween(Math.min(0.35, Math.abs(d) * 0.15 + 0.05), (k) => { a.turretRel = from + d * k; });
      a.turretRel = to; return;
    }
    if (a.isUnit && a.def.cat === 'inf') { a.facing = ang; return; }
    const from = a.facing || 0, d = angDiff(from, ang);
    if (Math.abs(d) > 0.05) await this.tween(Math.min(0.35, Math.abs(d) * 0.13 + 0.05), (k) => { a.facing = from + d * k; });
    a.facing = ang;
  }
  kick(a, proj) {
    if (proj === 'bullet' || proj === 'flak') return;
    a.recoil = 1; this.tween(0.3, (k) => { a.recoil = 1 - k; });
  }
  hitFlash(t) { if (!t || t.dead) return; t.hitFlash = 1; this.tween(0.25, (k) => { t.hitFlash = 1 - k; }); }

  async finishKill(e, killed) {
    if (!killed || !e || e.gone || e.crashing) return;
    const p = { ...this.r.posOf(e) };
    const fx = this.fx, col = this.g.players[e.owner].color;
    if (e.isBuilding) {
      fx.explosion(p.x, p.y, 1.8); fx.shake = 9;
      for (let k = 0; k < 5; k++) setTimeout(() => fx.explosion(p.x + (Math.random() - 0.5) * 44, p.y + (Math.random() - 0.5) * 34, 0.8 + Math.random() * 0.5), 110 * k);
      fx.debris(p.x, p.y, 24, '90,85,80');
      this.r.addRubble(p);
      e.gone = true; return;
    }
    if (e.def.mt === 'air') {
      // Absturz: trudeln, Rauchspur, Aufschlag
      e.crashing = true;
      const z0 = e.z ?? 26, f0 = e.facing, dx = (Math.random() - 0.5) * 50, dy = 20 + Math.random() * 20;
      fx.explosion(p.x, p.y - z0, 0.6);
      await this.tween(0.9, (k) => {
        e.z = z0 * (1 - k * k); e.facing = f0 + k * 9;
        e.vis = { x: p.x + dx * k, y: p.y + dy * k * 0.5 };
        if (Math.random() < 0.8) { fx.smoke(e.vis.x, e.vis.y - e.z, 1, 4, 0.95); fx.fire(e.vis.x, e.vis.y - e.z, 1, 3); }
      });
      const q = { ...e.vis };
      fx.explosion(q.x, q.y, 1.3); fx.shake = 6;
      this.r.addWreck(e, q);
      e.gone = true; return;
    }
    if (e.def.cat === 'inf') {
      fx.dust(p.x, p.y, 6, '150,120,90', 14, 4); fx.spark(p.x, p.y, 4, '255,160,100', 50);
      fx.corpse(p.x, p.y, e.facing + Math.PI / 2, col, e.type === 'rak' ? 2 : 3);
      e.gone = true; return;
    }
    fx.explosion(p.x, p.y, 1.2);
    fx.debris(p.x, p.y, 10, '60,58,55');
    this.r.addWreck(e, p);
    e.gone = true;
  }

  ensureVisible(x, y) {
    const s = this.r.w2s(x, y);
    if (s.x < 60 || s.y < 60 || s.x > this.r.vw - 60 || s.y > this.r.vh - 60) this.r.centerOn(x, y);
  }

  async playEvents(evs) {
    const g = this.g;
    for (const ev of evs) {
      if (ev.type === 'attack') await this.animAttack(ev);
      else if (ev.type === 'harvest') {
        const u = g.get(ev.u); if (!u || !g.seen(u)) continue;
        const p = this.r.posOf(u); u.harvestAnim = 1; this.r.float(p.x, p.y, `+${ev.amount} Glut`, '#ffb060');
        for (let k = 0; k < 10; k++) this.fx.add({ kind: 'glow', x: p.x + (Math.random() - 0.5) * 30, y: p.y + (Math.random() - 0.5) * 20, vy: -20, life: 0.8, size: 3, grow: 1, col: '255,150,60', a: 0.9 });
      } else if (ev.type === 'unload') {
        const u = g.get(ev.u); if (!u) continue;
        const ref = g.byId.get(ev.ref);
        if (ref && g.seen(u)) {
          const a = this.r.posOf(u), b = center(ref.c, ref.r);
          ref.unloading = 1;
          await this.tween(0.7, (k, dt) => {
            for (let n = 0; n < 3; n++) { const sx = a.x + (Math.random() - 0.5) * 12, sy = a.y + (Math.random() - 0.5) * 12; this.fx.add({ kind: 'glow', x: sx, y: sy, vx: (b.x - sx) * 1.6, vy: (b.y - sy) * 1.6 - 20, life: 0.6, size: 3, grow: -2, col: '255,150,60', a: 0.9 }); }
          });
          ref.unloading = 0;
        }
        if (u.owner === 0) { const p = this.r.posOf(u); this.r.float(p.x, p.y - 10, `+${ev.amount} Credits`, '#8ef08a', true); this.pulse('#credits'); }
      } else if (ev.type === 'spawn') {
        const u = g.get(ev.u); if (!u || !g.seen(u)) continue;
        const p = center(u.c, u.r); this.fx.ring(p.x, p.y, 8, '160,220,255', 0.5);
        const src = ev.from && g.byId.get(ev.from);
        if (src && g.seen(u)) {
          const a = center(src.c, src.r);
          u.facing = Math.atan2(p.y - a.y, p.x - a.x);
          if (u.def.mt === 'air') { u.z = 0; this.tween(0.9, (k) => { u.z = 26 * k; u.vis = { x: a.x + (p.x - a.x) * k * k, y: a.y + (p.y - a.y) * k * k }; if (Math.random() < 0.4) this.fx.dust(u.vis.x, u.vis.y, 1, '200,180,150', 18, 6); }).then(() => { u.vis = null; }); }
          else { u.anim = true; this.fx.dust(a.x, a.y + 10, 6, '160,140,120', 20, 6); this.tween(0.6, (k) => { const kk = 1 - (1 - k) * (1 - k); u.vis = { x: a.x + (p.x - a.x) * kk, y: a.y + (p.y - a.y) * kk }; }).then(() => { u.vis = null; u.anim = false; }); }
        } else if (u.def.mt === 'air') { u.z = 0; this.tween(0.8, (k) => { u.z = 26 * k; }); }
      } else if (ev.type === 'built') {
        const b = g.get(ev.b); if (!b || !g.seen(b)) continue;
        const p = this.r.posOf(b); b.rise = 0; this.fx.dust(p.x, p.y, 14, '170,150,120', 40, 8); this.tween(0.6, (k) => { b.rise = k; });
      } else if (ev.type === 'income') {
        if (ev.owner === 0) { const b = g.buildings.find((x) => x.owner === 0 && x.type === 'bauhof'); if (b) { const p = center(b.c, b.r); this.r.float(p.x, p.y - 20, `+${ev.amount} Credits`, '#8ef08a'); } }
      } else if (ev.type === 'rearm') {
        const u = g.get(ev.u); if (u && u.owner === 0) { const p = this.r.posOf(u); this.r.float(p.x, p.y - 26, 'Aufmunitioniert', '#a0e0ff'); }
      } else if (ev.type === 'storm') await this.animStorm(ev);
      else if (ev.type === 'worm') await this.animWorm(ev);
      else if (ev.type === 'blow') {
        const p = center(ev.c, ev.r);
        if (g.explored[g.i(ev.c, ev.r)]) { this.r.centerOn(p.x, p.y); await this.wait(0.3); this.fx.sandBurst(p.x, p.y, 40, 40); this.fx.flash(p.x, p.y, 60, '255,150,60', 0.5); this.r.float(p.x, p.y, 'Glutausbruch!', '#ffb060', true); await this.wait(0.8); }
      }
    }
    g.cleanup();
  }

  async animStorm(ev) {
    const g = this.g, s = g.storm;
    const a = center(ev.from.c, ev.from.r), b = center(ev.to.c, ev.to.r);
    const anyVisible = g.visible[g.i(ev.to.c, ev.to.r)] || g.visible[g.i(ev.from.c, ev.from.r)] || ev.hits.length;
    if (anyVisible) { this.r.centerOn((a.x + b.x) / 2, (a.y + b.y) / 2); await this.wait(0.25); }
    await this.tween(anyVisible ? 1.0 : 0.01, (k) => { s.vis = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; });
    s.vis = null;
    for (const h of ev.hits) {
      const e = g.byId.get(h.id); if (!e || !(g.seen(e) || e.owner === 0)) continue;
      const p = this.r.posOf(e); this.r.float(p.x, p.y, `-${h.dmg}`, '#ffcf8a');
      if (e.dead) await this.finishKill(e, true);
    }
    if (ev.hits.length) await this.wait(0.6);
  }

  async animWorm(ev) {
    const g = this.g, w = g.byId.get(ev.id); if (!w) return;
    const pts = ev.path.map((h) => center(h.c, h.r));
    const seenAny = ev.path.some((h) => g.visible[g.i(h.c, h.r)] || g.radar[g.i(h.c, h.r)]);
    const victim = ev.eat ? g.byId.get(ev.eat) : null;
    const show = seenAny || (victim && victim.owner === 0);
    if (!show) { if (victim) victim.gone = true; return; }
    w.forceShow = true;
    if (victim) this.r.centerOn(pts[pts.length - 1].x, pts[pts.length - 1].y);
    if (pts.length > 1) {
      await this.tween(0.22 * (pts.length - 1), (k) => {
        const f = k * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), l = f - i;
        w.vis = { x: pts[i].x + (pts[i + 1].x - pts[i].x) * l, y: pts[i].y + (pts[i + 1].y - pts[i].y) * l };
        if (Math.random() < 0.6) this.fx.dust(w.vis.x, w.vis.y, 1, '190,140,90', 20, 8);
      });
    }
    if (victim) {
      const p = pts[pts.length - 1];
      this.fx.shake = 8;
      this.fx.sandBurst(p.x, p.y, 50, 36);
      await this.tween(0.45, (k) => { w.surface = k; });
      victim.gone = true;
      this.fx.sandBurst(p.x, p.y, 30, 20);
      this.r.float(p.x, p.y - 30, 'Verschlungen!', '#ff7050', true);
      await this.wait(0.5);
      await this.tween(0.6, (k) => { w.surface = 1 - k; });
      w.surface = 0;
    }
    w.vis = null; w.forceShow = false;
  }

  pulse(sel) { const el = $(sel); if (!el) return; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }

  async banner(text, sub = '', dur = 1.1) {
    const el = $('#banner');
    el.innerHTML = `<div class="b-main">${text}</div>${sub ? `<div class="b-sub">${sub}</div>` : ''}`;
    el.classList.add('show');
    await this.wait(dur);
    el.classList.remove('show');
    await this.wait(0.2);
  }

  // ---------- Aktionen ----------
  async doMove(u, c, r, reach, animatedFollow) {
    const g = this.g;
    const path = g.moveUnit(u, c, r, reach);
    const visible = u.owner === 0 || path.some((h) => g.visible[g.i(h.c, h.r)]);
    if (visible) {
      if (u.owner !== 0) { const p = center(path[0].c, path[0].r); this.ensureVisible(p.x, p.y); }
      await this.animMove(u, path);
    }
    if (u.owner === 0) { g.updateVision(); this.r.fogDirty = true; }
  }

  async doAttack(u, t) {
    const ev = this.g.attack(u, t);
    await this.animAttack(ev);
    this.g.cleanup();
    if (u.owner === 0 || t.owner === 0) { this.g.updateVision(); this.r.fogDirty = true; }
    this.checkEnd();
  }

  // ---------- Auswahl ----------
  clearHL() { Object.assign(this.r.hl, { move: null, attack: [], build: [], drop: [], path: null, sel: null, forecast: null }); this.hideForecast(); }

  deselect() { this.sel = null; this.mode = 'idle'; this.reach = null; this.afterMove.clear(); this.clearHL(); this.showPanel(null); }

  select(e) {
    const g = this.g;
    this.clearHL();
    this.sel = e; this.r.hl.sel = e;
    this.mode = 'idle';
    if (e.isUnit && e.owner === 0 && g.current === 0 && !this.busy) {
      if (!e.moved && !e.acted) {
        this.reach = g.reachable(e);
        this.r.hl.move = this.reach;
        this.mode = 'unit';
        this.computeAfterMove(e);
      } else if (!e.acted) this.mode = 'moved';
      this.r.hl.attack = g.canFire(e) ? g.targetsFrom(e, e.c, e.r) : [];
      if (this.mode === 'unit') for (const [id] of this.afterMove) { const t = g.get(id); if (t && !this.r.hl.attack.includes(t)) this.r.hl.attack.push(t); }
    } else if (e.isBuilding && e.owner === 0 && e.def.weapon && g.canFire(e) && !this.busy) {
      this.mode = 'turret';
      this.r.hl.attack = g.targetsFrom(e, e.c, e.r);
    }
    this.showPanel(e);
  }

  computeAfterMove(u) {
    const g = this.g; this.afterMove.clear();
    const w = g.weapon(u); if (!w || w.noMoveFire || (w.ammo && u.ammo <= 0)) return;
    for (const n of this.reach.values()) {
      if (!n.end) continue;
      for (const t of g.targetsFrom(u, n.c, n.r)) {
        const prev = this.afterMove.get(t.id);
        const score = -n.cost + TERRAIN[g.terr(n.c, n.r)].def * 5;
        if (!prev || score > prev.score) this.afterMove.set(t.id, { c: n.c, r: n.r, score });
      }
    }
  }

  async handleTap(sx, sy) {
    const g = this.g;
    if (this.busy) return;
    const w = this.r.s2w(sx, sy);
    const { col: c, row: r } = pixelToHex(w.x, w.y);
    if (!g.in(c, r)) { this.deselect(); return; }
    const i = g.i(c, r);
    const vis = g.visible[i], exp = g.explored[i];
    const ug = g.unitAt(c, r, false), ua = g.unitAt(c, r, true), b = g.buildingAt(c, r);
    const enemyAt = [ua, ug, b].filter((e) => e && e.owner !== 0 && (e.isBuilding ? exp : vis));
    const ownAt = [ug, ua, b].filter((e) => e && e.owner === 0);

    if (this.mode === 'build') {
      if (this.r.hl.build.some(([bc, br]) => bc === c && br === r)) {
        const nb = g.placeBuilding(0, this.buildType, c, r);
        if (nb) { const p = center(c, r); this.fx.dust(p.x, p.y, 16, '170,150,120', 40, 8); this.fx.ring(p.x, p.y, 10, '140,255,160', 0.5); }
        this.deselect(); this.refresh(); return;
      }
      this.deselect(); return;
    }
    if (this.mode === 'drop') {
      if (this.r.hl.drop.some(([dc, dr]) => dc === c && dr === r)) {
        const ev = g.drop(this.sel, c, r);
        const t = g.get(ev.t); const from = this.r.posOf(this.sel), to = center(c, r);
        t.vis = { ...from }; await this.tween(0.35, (k) => { t.vis = { x: from.x + (to.x - from.x) * k, y: from.y - 20 * (1 - k) + (to.y - from.y) * k }; }); t.vis = null;
        this.fx.dust(to.x, to.y, 8, '200,160,110', 20, 6);
        g.updateVision(); this.r.fogDirty = true;
        this.deselect(); this.refresh(); return;
      }
      this.mode = 'moved'; this.select(this.sel); return;
    }
    if (this.mode === 'pickup') {
      const t = ownAt.find((e) => g.canPickup(this.sel, e));
      if (t) {
        const ev = g.pickup(this.sel, t);
        const from = this.r.posOf(t), to = this.r.posOf(this.sel);
        t.vis = { ...from }; await this.tween(0.35, (k) => { t.vis = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - 20 * k }; }); t.vis = null;
        const car = this.sel; this.deselect(); this.refresh();
        if (!car.acted) { this.select(car); this.flash('Aufgenommen — jetzt fliegen und absetzen'); }
        return;
      }
      this.select(this.sel); return;
    }

    // Angriff bestätigen / auswählen
    const sel = this.sel;
    if (sel && (this.mode === 'unit' || this.mode === 'moved' || this.mode === 'turret' || this.mode === 'confirm') && enemyAt.length) {
      const t = enemyAt.find((e) => this.r.hl.attack.includes(e));
      if (t) {
        if (this.mode === 'confirm' && this.confirmTarget === t) { await this.executeAttack(); return; }
        this.prepareAttack(t); return;
      }
    }
    if (this.mode === 'confirm') { this.mode = this.prevMode; this.select(this.sel); if (!enemyAt.length && !ownAt.length) return; }

    // Bewegung
    if (sel && this.mode === 'unit' && !ownAt.includes(sel)) {
      const n = this.reach.get(i);
      if (n && n.end && !(enemyAt.length)) {
        await this.moveSelected(c, r); return;
      }
    }
    // Auswahl wechseln (Stapel Boden/Luft durchschalten)
    if (ownAt.length) {
      const idx = ownAt.indexOf(sel);
      const next = idx >= 0 ? ownAt[(idx + 1) % ownAt.length] : ownAt[0];
      if (next === sel && ownAt.length === 1) { this.deselect(); return; }
      this.select(next); return;
    }
    if (enemyAt.length) { this.select(enemyAt[0]); return; }
    this.deselect();
    this.showTerrainInfo(c, r);
  }

  async moveSelected(c, r) {
    const g = this.g, u = this.sel;
    this.busy = true; this.clearHL(); this.r.hl.sel = u;
    await this.doMove(u, c, r, this.reach);
    this.busy = false;
    this.refresh();
    const targets = g.canFire(u) ? g.targetsFrom(u, u.c, u.r) : [];
    const carrierAct = u.def.carrier && !u.acted;
    if (!targets.length && !carrierAct) { u.acted = true; this.deselect(); this.refresh(); return; }
    this.mode = 'moved';
    this.select(u);
  }

  prepareAttack(t) {
    const g = this.g, u = this.sel;
    this.prevMode = this.mode === 'confirm' ? this.prevMode : this.mode;
    this.confirmTarget = t;
    let from = { c: u.c, r: u.r };
    if (this.mode === 'unit' && !g.targetsFrom(u, u.c, u.r).includes(t)) {
      const m = this.afterMove.get(t.id); if (!m) return;
      from = m;
      this.r.hl.path = g.pathFrom(this.reach, m.c, m.r);
    } else this.r.hl.path = null;
    this.attackFrom = from;
    this.mode = 'confirm';
    const f = this.forecastFrom(u, t, from);
    this.showForecast(t, f);
  }

  forecastFrom(u, t, from) {
    const g = this.g;
    const oc = u.c, or = u.r;
    u.c = from.c; u.r = from.r;
    const f = g.forecast(u, t);
    u.c = oc; u.r = or;
    return f;
  }

  async executeAttack() {
    const g = this.g, u = this.sel, t = this.confirmTarget, from = this.attackFrom;
    this.busy = true; this.hideForecast(); this.clearHL();
    if (u.isUnit && (from.c !== u.c || from.r !== u.r)) await this.doMove(u, from.c, from.r, this.reach);
    if (!u.dead && !t.dead) await this.doAttack(u, t);
    this.busy = false;
    this.deselect(); this.refresh();
  }

  // ---------- Rundenablauf ----------
  async endTurn() {
    const g = this.g;
    if (this.busy || g.current !== 0 || g.state !== 'play') return;
    this.busy = true; this.deselect();
    $('#endturn').disabled = true;
    // Auto-Ernter
    for (const u of g.ownUnits(0)) if (u.def.harvester && u.auto && !u.moved) await autoHarvest(g, u, this.actAnimated);
    await this.playEvents(g.endTurnEvents(0));
    if (this.checkEnd()) return;
    const foe = g.players[1];
    await this.banner(foe.name, 'ist am Zug', 0.9);
    g.current = 1;
    await this.playEvents(g.beginTurn(1));
    await aiTurn(g, this.actAnimated, 1);
    await this.playEvents(g.endTurnEvents(1));
    if (this.checkEnd()) return;
    await this.banner('Weltphase', 'Sturm · Würmer · Glut', 0.8);
    await this.playEvents(g.worldPhase());
    g.updateVision(); this.r.fogDirty = true;
    if (this.checkEnd()) return;
    await this.playEvents(g.beginTurn(0));
    g.updateVision(); this.r.fogDirty = true;
    this.refresh();
    await this.banner(`Runde ${g.round}`, g.isNight() ? 'Euer Zug · Nacht: Bodensicht −1' : 'Euer Zug', 0.9);
    this.busy = false;
    $('#endturn').disabled = false;
    this.refresh();
    this.save?.();
  }

  checkEnd() {
    const s = this.g.checkEnd();
    if (s === 'play') return false;
    this.busy = true;
    const el = $('#endscreen');
    const p = this.g.players[0];
    el.querySelector('h1').textContent = s === 'won' ? 'Der Sand gehört euch' : 'Eure Basis ist gefallen';
    el.querySelector('.stats').innerHTML = `Runde ${this.g.round} · Gegner vernichtet: ${p.stats.kills} · Eigene Verluste: ${p.stats.lost} · Glut geerntet: ${p.stats.harvested}`;
    el.classList.add('show');
    this.onEnd?.();
    return true;
  }

  nextUnit() {
    const g = this.g;
    const list = g.ownUnits(0).filter((u) => !u.acted && !u.carried && (!u.moved || g.canFire(u)) && !(u.def.harvester && u.auto && !u.moved));
    if (!list.length) { this.flash('Alle Einheiten haben gehandelt'); return; }
    const idx = list.indexOf(this.sel);
    const u = list[(idx + 1) % list.length];
    this.select(u);
    const p = center(u.c, u.r); this.r.centerOn(p.x, p.y);
  }

  // ---------- Eingabe ----------
  bindInput() {
    const cv = this.r.cv;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY, sx: e.offsetX, sy: e.offsetY, t: performance.now(), button: e.button });
      if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; }
    });
    cv.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) { this.hover(e.offsetX, e.offsetY); return; }
      const dx = e.offsetX - p.x, dy = e.offsetY - p.y;
      p.x = e.offsetX; p.y = e.offsetY;
      if (this.pointers.size === 2 && this.pinch) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.r.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / this.pinch.d); this.pinch.d = d;
        p.moved = true;
        return;
      }
      if (Math.hypot(p.x - p.sx, p.y - p.sy) > 8) p.moved = true;
      if (p.moved) { this.r.camTarget = null; this.r.cam.x -= dx / this.r.cam.z; this.r.cam.y -= dy / this.r.cam.z; this.r.clampCam(); }
    });
    const up = (e) => {
      const p = this.pointers.get(e.pointerId); if (!p) return;
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (!p.moved && performance.now() - p.t < 600 && this.pointers.size === 0) {
        if (p.button === 2) { this.deselect(); return; }
        this.handleTap(e.offsetX, e.offsetY);
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); this.pinch = null; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); this.r.camTarget = null; this.r.zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.deselect();
      else if (e.key === 'e' || e.key === 'E') this.endTurn();
      else if (e.key === 'n' || e.key === 'N' || e.key === 'Tab') { e.preventDefault(); this.nextUnit(); }
      else if (e.key === ' ' && this.mode === 'confirm') { e.preventDefault(); this.executeAttack(); }
      const k = 40 / this.r.cam.z;
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) this.r.cam.x -= k;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) this.r.cam.x += k;
      if (['ArrowUp', 'w', 'W'].includes(e.key)) this.r.cam.y -= k;
      if (['ArrowDown', 's', 'S'].includes(e.key)) this.r.cam.y += k;
      this.r.clampCam();
    });
    window.addEventListener('resize', () => this.r.resize());
  }

  hover(sx, sy) {
    const g = this.g;
    const w = this.r.s2w(sx, sy);
    const { col: c, row: r } = pixelToHex(w.x, w.y);
    if (!g.in(c, r)) { this.r.hl.hover = null; return; }
    this.r.hl.hover = { c, r };
    if (this.mode === 'unit' && this.sel && !this.busy) {
      const n = this.reach.get(g.i(c, r));
      this.r.hl.path = n && n.end ? g.pathFrom(this.reach, c, r) : null;
    }
  }

  // ---------- DOM ----------
  bindDom() {
    $('#endturn').onclick = () => this.endTurn();
    $('#nextunit').onclick = () => this.nextUnit();
    $('#helpbtn').onclick = () => $('#help').classList.toggle('show');
    $('#help').onclick = (e) => { if (e.target.id === 'help' || e.target.classList.contains('close')) $('#help').classList.remove('show'); };
    $('#zoomin').onclick = () => this.r.zoomAt(this.r.vw / 2, this.r.vh / 2, 1.2);
    $('#zoomout').onclick = () => this.r.zoomAt(this.r.vw / 2, this.r.vh / 2, 1 / 1.2);
    $('#fc-ok').onclick = () => this.executeAttack();
    $('#fc-no').onclick = () => { this.mode = this.prevMode; this.select(this.sel); };
    const mm = $('#minimap');
    const mmGo = (e) => {
      const rect = mm.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width * this.g.map.size.w, y = (e.clientY - rect.top) / rect.height * this.g.map.size.h;
      this.r.centerOn(x, y, false);
    };
    mm.addEventListener('pointerdown', (e) => { mmGo(e); mm.setPointerCapture(e.pointerId); mm.onpointermove = mmGo; });
    mm.addEventListener('pointerup', () => { mm.onpointermove = null; });
  }

  refresh() {
    const g = this.g, p = g.players[0];
    $('#round').textContent = g.round;
    const ph = g.dayPhase(); const tz = $('#daytime'); if (tz) { tz.textContent = { morgen: 'Morgen', tag: 'Tag', abend: 'Abend', nacht: 'Nacht' }[ph]; tz.parentElement.classList.toggle('night', ph === 'nacht'); }
    $('#credits').textContent = Math.floor(p.credits).toLocaleString('de-DE');
    const pw = $('#power');
    pw.textContent = `${p.powerProd - p.powerUse >= 0 ? '+' : ''}${p.powerProd - p.powerUse}`;
    pw.parentElement.classList.toggle('low', p.low);
    const left = g.ownUnits(0).filter((u) => !u.acted && !u.carried && !u.moved && !(u.def.harvester && u.auto)).length;
    $('#nextunit').textContent = left ? `Nächste Einheit (${left})` : 'Nächste Einheit';
    if (this.sel && !this.sel.dead) this.showPanel(this.sel, true);
  }

  flash(text) { this.g.say(text, 'info'); }

  updateLog() {
    const el = $('#log');
    const now = performance.now();
    const items = this.g.log.filter((m) => now - m.t < 7000).slice(-5);
    const html = items.map((m) => `<div class="msg ${m.kind}" style="opacity:${Math.min(1, (7000 - (now - m.t)) / 1200)}">${m.text}</div>`).join('');
    if (html !== this._logHtml) { el.innerHTML = html; this._logHtml = html; }
  }

  showForecast(t, f) {
    const el = $('#forecast');
    const name = t.isBuilding ? t.def.name : t.def.name;
    el.querySelector('.fc-title').textContent = `Angriff auf ${name}`;
    el.querySelector('.fc-dmg').textContent = `${Math.round(f.dmg)} %${f.kills ? ' · zerstört' : ''}`;
    el.querySelector('.fc-ctr').textContent = f.kills ? '—' : `${Math.round(f.counter)} %`;
    el.classList.add('show');
  }
  hideForecast() { $('#forecast').classList.remove('show'); }

  showTerrainInfo(c, r) {
    const g = this.g;
    if (!g.explored[g.i(c, r)]) { this.showPanel(null); return; }
    const t = TERRAIN[g.terr(c, r)];
    const sp = g.spiceAt(c, r);
    const mc = (mt) => { const v = MOVE_COST[mt][g.terr(c, r)]; return v === Infinity ? '—' : v; };
    $('#panel').innerHTML = `<div class="p-head"><div><div class="p-name">${t.name}</div><div class="p-sub">Feld ${c}·${r}</div></div></div>
      <div class="p-grid"><span>Deckung</span><b>${Math.round(t.def * 100)} %</b><span>Bebaubar</span><b>${t.build ? 'ja' : 'nein'}</b>
      <span>Wurmgebiet</span><b>${t.sand ? 'ja' : 'nein'}</b><span>Glut</span><b>${Math.round(sp)}</b>
      <span>Kosten Fuß/Rad/Kette</span><b>${mc('foot')}/${mc('wheel')}/${mc('track')}</b></div>
      ${g.inStorm(c, r) ? '<div class="p-warn">Im Sturm — unpassierbar</div>' : g.stormNext(c, r) ? '<div class="p-warn">Sturm zieht nächste Runde hierher</div>' : ''}`;
    $('#panel').classList.add('show');
  }

  showPanel(e, keep = false) {
    const el = $('#panel');
    if (!e || e.dead) { el.classList.remove('show'); el.innerHTML = ''; return; }
    const g = this.g;
    const own = e.owner === 0;
    const col = g.players[e.owner].color;
    const pct = e.isBuilding ? e.hp / e.maxHp * 100 : e.hp;
    const bar = `<div class="hpbar"><i style="width:${pct}%;background:${pct > 60 ? '#6fdc6a' : pct > 30 ? '#f2d35b' : '#ff6a50'}"></i></div>`;
    let html = `<div class="p-head"><canvas class="p-icon"></canvas><div><div class="p-name">${e.def.name}</div><div class="p-sub" style="color:${col}">${g.players[e.owner].name}</div>${bar}</div><button class="x" data-a="close">×</button></div>`;
    if (e.isUnit) {
      const w = g.weapon(e);
      html += `<div class="p-grid">
        <span>Stärke</span><b>${Math.ceil(e.hp)} / 100</b>
        <span>Bewegung</span><b>${e.def.move} (${MT_NAME[e.def.mt]})</b>
        <span>Panzerung</span><b>${ARMOR_NAME[e.def.armor]}</b>
        <span>Sicht</span><b>${e.def.sight}</b>
        ${w ? `<span>Waffe</span><b>Stärke ${w.power} · Reichweite ${w.range[0] === w.range[1] ? w.range[0] : w.range.join('–')}${w.air ? ' · Luft' : ''}${w.ground ? '' : ' (nur Luft)'}</b>` : ''}
        ${e.def.ammo ? `<span>Munition</span><b>${e.ammo} / ${e.def.ammo}</b>` : ''}
        ${e.def.harvester ? `<span>Ladung</span><b>${Math.round(e.cargo)} / ${e.def.capacity}</b>` : ''}
        ${e.def.carrier ? `<span>Fracht</span><b>${e.carrying ? g.get(e.carrying)?.def.name : 'leer'}</b>` : ''}
        ${e.def.mt !== 'air' ? `<span>Gelände</span><b>${TERRAIN[g.terr(e.c, e.r)].name} (${Math.round(TERRAIN[g.terr(e.c, e.r)].def * 100)} % Deckung)</b>` : ''}
      </div><div class="p-desc">${e.def.desc}</div>`;
      if (own && g.current === 0) {
        const btns = [];
        if (e.def.harvester) btns.push(`<button data-a="auto" class="${e.auto ? 'on' : ''}">Auto-Ernte: ${e.auto ? 'an' : 'aus'}</button>`);
        if (e.def.carrier && !e.acted) {
          if (e.carrying) btns.push('<button data-a="drop">Absetzen</button>');
          else if (g.units.some((t) => g.canPickup(e, t))) btns.push('<button data-a="pickup">Aufnehmen</button>');
        }
        if (!e.acted) btns.push('<button data-a="wait">Warten</button>');
        html += `<div class="p-actions">${btns.join('')}</div>`;
        const state = e.acted ? 'Hat gehandelt' : e.moved ? (g.canFire(e) ? 'Bewegt — kann noch angreifen' : 'Bewegt') : 'Bereit';
        html += `<div class="p-state">${state}</div>`;
      }
    } else {
      html += `<div class="p-grid"><span>Zustand</span><b>${Math.ceil(e.hp)} / ${e.maxHp}</b>
        <span>Energie</span><b>${e.def.power > 0 ? '+' : ''}${e.def.power}</b>
        ${e.turnsLeft > 0 ? `<span>Im Bau</span><b>noch ${e.turnsLeft} ${e.turnsLeft === 1 ? 'Runde' : 'Runden'}</b>` : ''}
        ${e.producing ? `<span>Produziert</span><b>${UNITS[e.producing].name} (nächste Runde)</b>` : ''}</div>
        <div class="p-desc">${e.def.desc}</div>`;
      if (own && g.current === 0 && e.turnsLeft <= 0) html += this.buildMenuHtml(e);
    }
    el.innerHTML = html;
    el.classList.add('show');
    const ic = el.querySelector('.p-icon');
    if (ic) { const src = icon(e.isUnit ? 'unit' : 'bld', e.type, col); ic.width = 60; ic.height = 45; ic.getContext('2d').drawImage(src, 0, 0, 60, 45); }
    el.querySelectorAll('canvas[data-icon]').forEach((c) => { const [k, t] = c.dataset.icon.split(':'); const src = icon(k, t, g.players[0].color); c.width = 72; c.height = 54; c.getContext('2d').drawImage(src, 0, 0, 72, 54); });
    el.querySelectorAll('[data-a]').forEach((b) => b.onclick = (ev) => this.panelAction(b.dataset.a, b.dataset.t, e, ev));
  }

  buildMenuHtml(b) {
    const g = this.g, p = g.players[0];
    let items = [], title = '';
    if (b.type === 'bauhof') {
      const ready = g.bauhofReady(0);
      title = ready ? 'Bauen (ein Gebäude pro Runde)' : 'Bauhof hat diese Runde schon gebaut';
      for (const [t, d] of Object.entries(BUILDINGS)) {
        if (d.buildable === false) continue;
        const pre = g.prereqOk(0, d), money = p.credits >= d.cost;
        const missing = pre ? '' : 'Benötigt: ' + d.prereq.filter((x) => !g.has(0, x)).map((x) => BUILDINGS[x].name).join(', ');
        items.push({ kind: 'bld', t, d, ok: ready && pre && money, missing, sub: `${d.cost} · ${d.turns} ${d.turns === 1 ? 'Runde' : 'Runden'}` });
      }
    } else if (b.def.produces) {
      title = b.producing ? `In Produktion: ${UNITS[b.producing].name}` : p.low ? 'Energie zu niedrig für Produktion' : 'Produzieren (fertig nächste Runde)';
      for (const [t, d] of Object.entries(UNITS)) {
        if (d.cat !== b.def.produces) continue;
        const pre = g.prereqOk(0, d);
        const missing = pre ? '' : 'Benötigt: ' + d.prereq.filter((x) => !g.has(0, x)).map((x) => BUILDINGS[x].name).join(', ');
        items.push({ kind: 'unit', t, d, ok: g.canProduce(b, t), missing, sub: `${d.cost}` });
      }
    } else return '';
    const cards = items.map((it) => `<button class="card ${it.ok ? '' : 'locked'}" data-a="${it.kind === 'bld' ? 'build' : 'prod'}" data-t="${it.t}" title="${it.missing || it.d.desc}">
      <canvas data-icon="${it.kind === 'bld' ? 'bld' : 'unit'}:${it.t}"></canvas><span class="c-name">${it.d.name}</span><span class="c-cost">◈ ${it.sub}</span>${it.missing ? `<span class="c-lock">${it.missing}</span>` : ''}</button>`).join('');
    const cancel = b.producing ? '<button data-a="cancelprod" class="wide">Produktion abbrechen (Rückerstattung)</button>' : '';
    return `<div class="p-title">${title}</div><div class="cards">${cards}</div>${cancel}`;
  }

  panelAction(a, t, e) {
    const g = this.g;
    if (this.busy && a !== 'close') return;
    if (a === 'close') { this.deselect(); return; }
    if (a === 'wait') { e.acted = true; e.moved = true; this.deselect(); this.refresh(); return; }
    if (a === 'auto') { e.auto = !e.auto; this.showPanel(e); return; }
    if (a === 'build') {
      const d = BUILDINGS[t];
      if (!g.bauhofReady(0) || !g.prereqOk(0, d) || g.players[0].credits < d.cost) { this.flash(g.players[0].credits < d.cost ? 'Zu wenig Credits' : 'Noch nicht verfügbar'); return; }
      this.clearHL(); this.mode = 'build'; this.buildType = t;
      this.r.hl.build = g.buildHexes(0, t);
      if (!this.r.hl.build.length) { this.flash('Kein freies Felsfeld in Reichweite der Basis'); this.mode = 'idle'; return; }
      this.flash(`${d.name}: grünes Feld antippen`);
      $('#panel').classList.remove('show');
      return;
    }
    if (a === 'prod') { if (g.produce(e, t)) { this.flash(`${UNITS[t].name} in Auftrag gegeben`); this.refresh(); this.showPanel(e); } else this.flash('Produktion nicht möglich'); return; }
    if (a === 'cancelprod') { g.cancelProduce(e); this.refresh(); this.showPanel(e); return; }
    if (a === 'pickup') { this.mode = 'pickup'; this.clearHL(); this.r.hl.sel = e; this.r.hl.drop = g.units.filter((u) => g.canPickup(e, u)).map((u) => [u.c, u.r]); this.flash('Einheit zum Aufnehmen antippen'); return; }
    if (a === 'drop') { this.mode = 'drop'; this.clearHL(); this.r.hl.sel = e; this.r.hl.drop = g.dropHexes(e); this.flash('Feld zum Absetzen antippen'); return; }
  }

  drawMinimap() {
    const g = this.g, cv = $('#minimap'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height, sx = W / g.map.size.w, sy = H / g.map.size.h;
    ctx.drawImage(g.map.base, 0, 0, W, H);
    const cols = { sand: null };
    for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) {
      const i = g.i(c, r), p = center(c, r);
      if (!g.explored[i]) { ctx.fillStyle = 'rgba(6,4,8,0.95)'; ctx.fillRect((p.x - R) * sx, (p.y - R) * sy, R * 2 * sx + 1, R * 2 * sy + 1); continue; }
      if (g.spiceAt(c, r) > 0) { ctx.fillStyle = 'rgba(220,100,40,0.8)'; ctx.fillRect((p.x - 10) * sx, (p.y - 10) * sy, 20 * sx + 1, 20 * sy + 1); }
      if (!g.visible[i]) { ctx.fillStyle = 'rgba(6,4,8,0.4)'; ctx.fillRect((p.x - R) * sx, (p.y - R) * sy, R * 2 * sx + 1, R * 2 * sy + 1); }
    }
    for (const b of g.buildings) if (g.seen(b)) { const p = center(b.c, b.r); ctx.fillStyle = g.players[b.owner].color; ctx.fillRect(p.x * sx - 3, p.y * sy - 3, 6, 6); }
    for (const u of g.units) if (!u.carried && g.seen(u)) { const p = center(u.c, u.r); ctx.fillStyle = g.players[u.owner].color; ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, 2, 0, 6.28); ctx.fill(); }
    for (const w of g.worms) if (g.wormSeen(w)) { const p = center(w.c, w.r); ctx.strokeStyle = '#ffcc66'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, 3.5, 0, 6.28); ctx.stroke(); }
    const s = g.storm; if (s) { const p = center(s.c, s.r); ctx.fillStyle = 'rgba(200,130,60,0.45)'; ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, (s.rad + 0.5) * 66 * sx, 0, 6.28); ctx.fill(); }
    const cam = this.r.cam;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1;
    ctx.strokeRect(cam.x * sx, cam.y * sy, this.r.vw / cam.z * sx, this.r.vh / cam.z * sy);
  }
}
