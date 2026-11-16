// Renderer: Kamera, Gelände, Glut, Markierungen, Einheiten, Sturm, Nebel
import { center, hexPath, R, HW, ring, distance } from './hex.js';
import { drawUnit, drawBuilding, drawWormSign, drawWormMaw, drawPod, drawThumper, drawSandWhirl, drawWormRidge } from './sprites.js';
import { WORM_SIZES } from './data.js';
import { clamp, rgba } from './util.js';

const FILTER_OK = (() => { try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch { return false; } })();

export class Renderer {
  constructor(canvas, game, fx) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.g = game; this.fx = fx;
    this.cam = { x: 0, y: 0, z: 1 };
    this.floaters = [];
    this.hl = { move: null, attack: [], build: [], drop: [], target: [], path: null, sel: null, hover: null, forecast: null };
    this.pods = [];
    this.t = 0;
    this.fogDirty = true;
    this.spiceSprites = this.makeSpiceSprites();
    this.wrecks = []; this.rubble = []; this.bolts = [];
    this.light = [255, 255, 255]; this.nightK = 0;
    this.stormParticles = Array.from({ length: 160 }, () => ({ a: Math.random() * 6.28, d: Math.random(), s: 0.5 + Math.random(), y: Math.random() }));
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.cv.clientWidth, h = this.cv.clientHeight;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.dpr = dpr; this.vw = w; this.vh = h;
    this.clampCam();
  }

  // ---------- Kamera ----------
  s2w(sx, sy) { return { x: sx / this.cam.z + this.cam.x, y: sy / this.cam.z + this.cam.y }; }
  w2s(wx, wy) { return { x: (wx - this.cam.x) * this.cam.z, y: (wy - this.cam.y) * this.cam.z }; }
  clampCam() {
    const ms = this.g.map.size, z = this.cam.z;
    const vw = this.vw / z, vh = this.vh / z;
    this.cam.x = ms.w < vw ? (ms.w - vw) / 2 : clamp(this.cam.x, -60, ms.w - vw + 60);
    this.cam.y = ms.h < vh ? (ms.h - vh) / 2 : clamp(this.cam.y, -60, ms.h - vh + 60);
  }
  zoomAt(sx, sy, f) {
    const before = this.s2w(sx, sy);
    this.cam.z = clamp(this.cam.z * f, 0.45, 2.2);
    this.cam.x = before.x - sx / this.cam.z; this.cam.y = before.y - sy / this.cam.z;
    this.clampCam();
  }
  centerOn(x, y, smooth = true) {
    const tx = x - this.vw / this.cam.z / 2, ty = y - this.vh / this.cam.z / 2;
    if (smooth) this.camTarget = { x: tx, y: ty }; else { this.cam.x = tx; this.cam.y = ty; this.clampCam(); }
  }

  // ---------- Hilfen ----------
  makeSpiceSprites() {
    const out = [];
    for (let v = 0; v < 4; v++) {
      const s = Math.ceil(R * 2.6), cv = document.createElement('canvas'); cv.width = cv.height = s;
      const c = cv.getContext('2d'), m = s / 2;
      const g = c.createRadialGradient(m, m, 2, m, m, R * 1.2);
      g.addColorStop(0, 'rgba(214,92,40,0.75)'); g.addColorStop(0.55, 'rgba(204,104,50,0.45)'); g.addColorStop(1, 'rgba(200,110,60,0)');
      c.fillStyle = g; c.fillRect(0, 0, s, s);
      for (let k = 0; k < 140; k++) {
        const a = Math.random() * 6.28, d = Math.pow(Math.random(), 0.7) * R * 1.05;
        const x = m + Math.cos(a) * d, y = m + Math.sin(a) * d * 0.9, rr = 0.6 + Math.random() * 1.8;
        c.fillStyle = Math.random() < 0.3 ? 'rgba(255,170,90,0.9)' : 'rgba(150,50,25,0.75)';
        c.beginPath(); c.arc(x, y, rr, 0, 6.28); c.fill();
      }
      out.push(cv);
    }
    return out;
  }

  // Zeichnet über einen kleinen Puffer und färbt ein — schneller als ctx.filter
  tinted(ctx, x, y, tint, draw, size = 170) {
    const k = this.cam.z * this.dpr, S = Math.ceil(size * k);
    const oc = this._oc || (this._oc = document.createElement('canvas'));
    if (oc.width !== S) { oc.width = S; oc.height = S; }
    const o = oc.getContext('2d');
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-over'; o.clearRect(0, 0, S, S);
    o.setTransform(k, 0, 0, k, S / 2, S / 2);
    draw(o);
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = 'source-atop'; o.fillStyle = tint; o.fillRect(0, 0, S, S);
    ctx.drawImage(oc, x - size / 2, y - size / 2, size, size);
  }

  float(x, y, text, color = '#fff', big = false) { this.floaters.push({ x, y, text, color, t: 0, life: 1.4, big }); }

  posOf(e) { if (e.vis) return e.vis; const p = center(e.c, e.r); return p; }

  // ---------- Zeichnen ----------
  draw(dt) {
    this.t += dt;
    const { ctx, g, cam } = this;
    if (this.camTarget) {
      cam.x += (this.camTarget.x - cam.x) * Math.min(1, dt * 6); cam.y += (this.camTarget.y - cam.y) * Math.min(1, dt * 6);
      if (Math.hypot(this.camTarget.x - cam.x, this.camTarget.y - cam.y) < 1) this.camTarget = null;
      this.clampCam();
    }
    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#120d0a'; ctx.fillRect(0, 0, this.vw, this.vh);
    const sh = this.fx.shake;
    const ox = sh ? (Math.random() - 0.5) * sh * 2 : 0, oy = sh ? (Math.random() - 0.5) * sh * 2 : 0;
    ctx.setTransform(dpr * cam.z, 0, 0, dpr * cam.z, (-cam.x * cam.z + ox) * dpr, (-cam.y * cam.z + oy) * dpr);
    const view = { x0: cam.x - 80, y0: cam.y - 80, x1: cam.x + this.vw / cam.z + 80, y1: cam.y + this.vh / cam.z + 80 };
    this.view = view;

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(g.map.base, 0, 0);
    this.drawSandDrift(ctx);
    this.drawHeat(ctx);

    // Glut
    for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) {
      const sp = g.spiceAt(c, r); if (sp <= 0 || !g.explored[g.i(c, r)]) continue;
      const p = center(c, r); if (p.x < view.x0 || p.x > view.x1 || p.y < view.y0 || p.y > view.y1) continue;
      const spr = this.spiceSprites[(c * 7 + r * 13) % 4];
      ctx.globalAlpha = clamp(0.25 + sp / 700, 0.3, 1);
      ctx.drawImage(spr, p.x - spr.width / 2, p.y - spr.height / 2);
      if (Math.random() < 0.012) this.fx.add({ kind: 'glow', x: p.x + (Math.random() - 0.5) * R, y: p.y + (Math.random() - 0.5) * R, vy: -6, life: 0.9, size: 2.5, grow: 1, col: '255,170,90', a: 0.9 });
    }
    ctx.globalAlpha = 1;

    // Raster
    ctx.strokeStyle = 'rgba(40,25,15,0.16)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) {
      const p = center(c, r); if (p.x < view.x0 || p.x > view.x1 || p.y < view.y0 || p.y > view.y1) continue;
      hexPath(ctx, p.x, p.y, R - 0.5);
    }
    ctx.stroke();

    this.drawStormForecast(ctx);
    this.fx.drawDecals(ctx);

    this.drawWrecks(ctx, dt);
    for (const th of g.thumpers) if (th.owner === 0 || g.visible[g.i(th.c, th.r)]) { const p = center(th.c, th.r); drawThumper(ctx, p.x, p.y, this.t); }
    for (const st of g.strikes) {
      const p = center(st.c, st.r), k = (this.t * 1.2) % 1;
      ctx.strokeStyle = `rgba(255,60,40,${0.9 - k * 0.6})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 70 * (1 - k * 0.3), 0, 6.28); ctx.stroke();
      ctx.setLineDash([8, 8]); ctx.lineDashOffset = -this.t * 30; ctx.lineWidth = 1.5;
      for (const [c, r] of ring(st.c, st.r, 1, g.W, g.H)) { const q = center(c, r); ctx.beginPath(); hexPath(ctx, q.x, q.y, R - 4); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,80,60,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - 14, p.y); ctx.lineTo(p.x + 14, p.y); ctx.moveTo(p.x, p.y - 14); ctx.lineTo(p.x, p.y + 14); ctx.stroke();
    }
    for (const wc of g.wormCalls) if (wc.owner === 0) { const p = center(wc.c, wc.r); drawThumper(ctx, p.x, p.y, this.t * 1.6); }
    for (const d of g.players[0].pendingDrops) {
      const p = center(d.c, d.r), k = (this.t * 1.5) % 1;
      ctx.strokeStyle = `rgba(255,210,120,${1 - k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 6 + k * 26, 0, 6.28); ctx.stroke();
      ctx.fillStyle = 'rgba(255,210,120,0.9)'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 6.28); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createLinearGradient(p.x, p.y - 160, p.x, p.y); gr.addColorStop(0, 'rgba(255,200,100,0)'); gr.addColorStop(1, 'rgba(255,200,100,0.35)');
      ctx.fillStyle = gr; ctx.fillRect(p.x - 2, p.y - 160, 4, 160); ctx.globalCompositeOperation = 'source-over';
    }
    // Gebäude
    const bs = g.buildings.filter((b) => !b.gone && g.seen(b)).sort((a, b) => a.r - b.r);
    for (const b of bs) {
      const p = this.posOf(b);
      const col = g.players[b.owner].color;
      const bo = { unloading: b.unloading > 0, recoil: b.recoil || 0, door: b.door || 0 };
      if (b.hitFlash > 0.05) this.tinted(ctx, p.x, p.y, `rgba(255,255,255,${b.hitFlash * 0.6})`, (o) => drawBuilding(o, b, 0, 0, col, this.t, bo), 90);
      else drawBuilding(ctx, b, p.x, p.y, col, this.t, bo);
      if (b.turnsLeft > 0 && Math.random() < 0.08) { const sx = p.x + (Math.random() - 0.5) * 30, sy = p.y + (Math.random() - 0.5) * 30; this.fx.spark(sx, sy, 3, '255,230,150', 50); this.fx.flash(sx, sy, 8, '200,230,255', 0.06); }
      const hpk = b.hp / b.maxHp;
      if (hpk < 0.6 && Math.random() < 0.05) this.fx.smoke(p.x + (Math.random() - 0.5) * 30, p.y + (Math.random() - 0.5) * 24, 1, 5, 0.8);
      if (hpk < 0.3 && Math.random() < 0.08) this.fx.fire(p.x + (Math.random() - 0.5) * 26, p.y + (Math.random() - 0.5) * 20, 1, 4);
      if (b.producing) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(p.x + 22, p.y - 22, 8, 0, 6.28); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x + 22, p.y - 22, 6, this.t * 4, this.t * 4 + 4); ctx.stroke(); }
    }

    // Wurmzeichen
    for (const w of g.worms) {
      if (w.gone) continue;
      const p = w.vis || center(w.c, w.r);
      const seen = g.wormSeen(w) || w.forceShow;
      const sc = WORM_SIZES[w.size || 1].scale;
      if (w.whirl > 0) drawSandWhirl(ctx, p.x, p.y, this.t, w.whirl, sc);
      if (w.surface > 0) { /* wird über dem Staub gezeichnet */ }
      else if (seen && w.vis) drawWormRidge(ctx, p.x, p.y, w.dir || 0, this.t, sc);
      else if (seen) {
        drawWormSign(ctx, p.x, p.y, this.t, 1, sc);
        if (w.vis && Math.random() < 0.7) { this.fx.dust(p.x, p.y, 2, '200,150,95', 30, 9); this.fx.add({ kind: 'debris', x: p.x + (Math.random() - 0.5) * 30, y: p.y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 20, vz: 60 + Math.random() * 80, life: 0.8, size: 2.5, col: '214,168,104', a: 1 }); }
      }
    }

    // Bodeneinheiten
    const visU = g.units.filter((u) => !u.gone && !u.carried && !u.hidden && (g.seen(u) || u.forceShow));
    const ground = visU.filter((u) => u.def.mt !== 'air').sort((a, b) => this.posOf(a).y - this.posOf(b).y);
    const air = visU.filter((u) => u.def.mt === 'air').sort((a, b) => this.posOf(a).y - this.posOf(b).y);
    for (const u of ground) this.drawUnitFull(ctx, u);
    this.fx.draw(ctx, 'ground', view);
    this.fx.draw(ctx, 'air', view);
    for (const w of g.worms) if (w.surface > 0) { const p = w.vis || center(w.c, w.r); drawWormMaw(ctx, p.x, p.y, this.t, w.surface, WORM_SIZES[w.size || 1].scale); }
    for (const u of air) this.drawUnitFull(ctx, u);
    for (const pd of this.pods) drawPod(ctx, pd.x, pd.y, pd.h, pd.open, pd.color, this.t);
    this.drawProjectiles(ctx);
    this.fx.draw(ctx, 'add', view);
    this.drawClouds(ctx, dt);
    this.drawLighting(ctx, dt, bs, [...ground, ...air]);

    this.drawStorm(ctx);
    this.drawFog(ctx);
    this.drawWind(ctx, dt);
    this.drawHighlights(ctx);

    // Overlays nach dem Nebel
    for (const u of [...ground, ...air]) this.drawBadges(ctx, u);
    for (const b of bs) this.drawBadges(ctx, b);
    this.drawPath(ctx);
    this.drawFloaters(ctx, dt);
    this.fx.update(dt);
  }

  drawUnitFull(ctx, u) {
    const g = this.g;
    let p = this.posOf(u);
    const col = g.players[u.owner].color;
    const done = u.owner === g.current && g.current === 0 && (u.acted || (u.moved && !g.canFire(u) && !(u.def.carrier && !u.acted)));
    if (this.hl.sel === u) {
      ctx.save(); ctx.translate(center(u.c, u.r).x, center(u.c, u.r).y); ctx.rotate(this.t * 0.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.beginPath(); hexPath(ctx, 0, 0, R - 5); ctx.stroke(); ctx.restore();
    }
    ctx.save();
    const turretUnit = u.type === 'panzer' || u.type === 'werfer' || u.type === 'laserpanzer' || u.type === 'koloss' || u.type === 'flakwagen';
    const idleTurret = turretUnit && !(u.aimUntil > this.t) ? Math.sin(this.t * 0.45 + u.id * 1.7) * 0.4 : (u.turretRel || 0);
    const air = u.def.mt === 'air';
    const z = air ? (u.z ?? 26) + (u.crashing ? 0 : Math.sin(this.t * 2.2 + u.id) * 1.8) : 0;
    const o = { ring: !u.crashing && !u.sink, scale: u.sink ? 1.62 * (1 - u.sink * 0.85) : undefined, bank: u.bank || 0, moving: !!u.anim, turret: idleTurret, recoil: u.recoil || 0, harvesting: u.harvestAnim > 0, z };
    if (u.def.carrier && u.carrying) {
      const c = g.get(u.carrying);
      if (c) o.carry = () => drawUnit(ctx, c, 0, 0, col, this.t, { turret: 0 });
    }
    if (u.owner === 0 && u.def.stealth && g.stealthed(u, 1)) ctx.globalAlpha = 0.55;
    let py = p.y;
    if (u.def.cat === 'veh' && u.anim) py += Math.sin(this.t * 22 + u.id) * 0.7;
    const savedFacing = u.facing;
    if (u.def.cat === 'inf' && !u.anim && !(u.aimUntil > this.t)) u.facing = savedFacing + Math.sin(this.t * 0.6 + u.id * 2.1) * 0.25;
    const p0 = p; p = { x: p0.x, y: py };
    if (u.hitFlash > 0.05) this.tinted(ctx, p.x, p.y, `rgba(255,255,255,${u.hitFlash * 0.65})`, (oc) => drawUnit(oc, u, 0, 0, col, this.t, o));
    else if (done) this.tinted(ctx, p.x, p.y, 'rgba(70,64,58,0.5)', (oc) => drawUnit(oc, u, 0, 0, col, this.t, o));
    else drawUnit(ctx, u, p.x, p.y, col, this.t, o);
    u.facing = savedFacing;
    ctx.restore();
    // Leerlauf: Abgase, Erntewalze
    if (u.def.cat === 'veh' && Math.random() < (u.anim ? 0.25 : 0.03)) {
      const bx = p.x - Math.cos(u.facing) * 16, by = p.y - Math.sin(u.facing) * 16;
      this.fx.add({ kind: 'puff', x: bx, y: by, vx: -Math.cos(u.facing) * 6, vy: -8, life: 1.1, size: 2.5, grow: 7, col: '70,66,62', a: 0.35, air: true });
    }
    if (u.harvestAnim > 0) u.harvestAnim = Math.max(0, u.harvestAnim - 0.004);
    if (u.def.harvester && !u.anim && g.spiceAt(u.c, u.r) > 0 && Math.random() < 0.35) {
      const fx = p.x + Math.cos(u.facing) * 24, fy = p.y + Math.sin(u.facing) * 24;
      this.fx.add({ kind: 'puff', x: fx + (Math.random() - 0.5) * 14, y: fy, vx: 8 + Math.random() * 10, vy: -14 - Math.random() * 10, life: 2.2, size: 4, grow: 12, col: Math.random() < 0.5 ? '205,120,60' : '190,150,100', a: 0.3, air: true });
      if (Math.random() < 0.3) this.fx.add({ kind: 'glow', x: fx, y: fy, vx: (Math.random() - 0.5) * 20, vy: -18, life: 0.9, size: 2.5, grow: 0, col: '255,160,70', a: 0.9 });
    }
    if (u.stunned > 0) this.statusIcon(ctx, p.x, p.y - 26 - z, 'stun');
    if (u.shield > 0) this.statusIcon(ctx, p.x, p.y - z, 'shield');
  }

  statusIcon(ctx, x, y, kind) {
    const t = this.t;
    if (kind === 'stun') {
      ctx.strokeStyle = 'rgba(200,140,255,0.9)'; ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { const a = t * 3 + k * 2.09; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 8, y + Math.sin(a) * 3, 2.2, 0, 6.28); ctx.stroke(); }
    } else if (kind === 'shield') {
      ctx.strokeStyle = `rgba(120,200,255,${0.45 + 0.25 * Math.sin(t * 4)})`; ctx.lineWidth = 2;
      ctx.beginPath(); hexPath(ctx, x, y, R - 8); ctx.stroke();
      ctx.fillStyle = 'rgba(120,200,255,0.08)'; ctx.fill();
    }
  }

  addWreck(e, p) {
    this.wrecks.push({ x: p.x, y: p.y, facing: e.facing, unit: { type: e.type, def: e.def, facing: e.facing, id: e.id, cargo: 0, ammo: 0 }, color: this.g.players[e.owner].color, t: 0, life: 45 });
    if (this.wrecks.length > 25) this.wrecks.shift();
  }
  addRubble(p) {
    const chunks = Array.from({ length: 26 }, () => ({ x: (Math.random() - 0.5) * 50, y: (Math.random() - 0.5) * 40, s: 2 + Math.random() * 5, a: Math.random() * 6, c: 60 + Math.random() * 60 }));
    this.rubble.push({ x: p.x, y: p.y, chunks, t: 0 });
    if (this.rubble.length > 20) this.rubble.shift();
  }

  drawWrecks(ctx, dt) {
    for (const r of this.rubble) {
      r.t += dt;
      const gr = ctx.createRadialGradient(r.x, r.y, 4, r.x, r.y, 36); gr.addColorStop(0, 'rgba(20,14,10,0.6)'); gr.addColorStop(1, 'rgba(20,14,10,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(r.x, r.y, 36, 0, 6.28); ctx.fill();
      for (const c of r.chunks) { ctx.fillStyle = `rgb(${c.c},${c.c * 0.92},${c.c * 0.85})`; ctx.save(); ctx.translate(r.x + c.x, r.y + c.y); ctx.rotate(c.a); ctx.fillRect(-c.s / 2, -c.s / 2, c.s, c.s * 0.7); ctx.restore(); }
      if (r.t < 14 && Math.random() < 0.12) this.fx.fire(r.x + (Math.random() - 0.5) * 30, r.y + (Math.random() - 0.5) * 24, 1, 4);
      if (r.t < 30 && Math.random() < 0.08) this.fx.smoke(r.x + (Math.random() - 0.5) * 30, r.y, 1, 6, 0.9);
    }
    const keep = [];
    for (const w of this.wrecks) {
      w.t += dt; if (w.t > w.life) continue; keep.push(w);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (w.life - w.t) / 6);
      if (!w.img) { w.img = true; }
      this.tinted(ctx, w.x, w.y, 'rgba(24,20,17,0.82)', (oc) => drawUnit(oc, w.unit, 0, 0, '#333333', 0, { z: 0, turret: 0.6 }), 120);
      ctx.restore();
      if (w.t < 20 && Math.random() < 0.1) this.fx.smoke(w.x, w.y, 1, 4, 0.95);
      if (w.t < 6 && Math.random() < 0.15) this.fx.fire(w.x, w.y, 1, 3);
    }
    this.wrecks = keep;
  }

  lightTarget() {
    const ph = this.g.dayPhase ? this.g.dayPhase() : 'tag';
    return { morgen: [255, 206, 172], tag: [255, 244, 226], abend: [255, 160, 112], nacht: [88, 102, 165] }[ph];
  }

  drawLighting(ctx, dt, bs, units) {
    const tgt = this.lightTarget();
    for (let k = 0; k < 3; k++) this.light[k] += (tgt[k] - this.light[k]) * Math.min(1, dt * 1.2);
    const L = this.light;
    const night = Math.max(0, Math.min(1, (255 - (L[0] + L[1]) / 2) / 150));
    this.nightK = night;
    if (L[0] > 252 && L[1] > 252 && L[2] > 252) return;
    const v = this.view;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${L[0] | 0},${L[1] | 0},${L[2] | 0})`;
    ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    ctx.globalCompositeOperation = 'lighter';
    if (night > 0.15) {
      const a = night;
      const glow = (x, y, r, col, al) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${al})`); gr.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill(); };
      for (const b of bs) {
        const p = this.posOf(b);
        glow(p.x, p.y, 46, '255,190,110', 0.28 * a);
        for (let k = 0; k < 3; k++) glow(p.x - 12 + k * 12, p.y + 6, 6, '255,220,150', (0.5 + 0.3 * Math.sin(this.t * 3 + k + b.id)) * a);
      }
      for (const u of units) {
        const p = this.posOf(u);
        if (u.def.mt === 'air') {
          const z = u.z ?? 26, blink = Math.floor(this.t * 2 + u.id) % 2;
          glow(p.x - 9, p.y - z, 5, blink ? '255,60,60' : '60,255,120', 0.9 * a);
          glow(p.x, p.y - z, 30, '200,220,255', 0.12 * a);
        } else if (u.def.cat === 'veh') {
          const hx = p.x + Math.cos(u.facing) * 30, hy = p.y + Math.sin(u.facing) * 30;
          glow(hx, hy, 26, '255,240,200', 0.22 * a);
        } else glow(p.x, p.y, 14, '255,200,140', 0.15 * a);
      }
      // Glut leuchtet nachts
      for (let r = 0; r < this.g.H; r++) for (let c = 0; c < this.g.W; c++) {
        if (this.g.spiceAt(c, r) <= 0 || !this.g.explored[this.g.i(c, r)]) continue;
        const p = center(c, r); if (p.x < v.x0 || p.x > v.x1 || p.y < v.y0 || p.y > v.y1) continue;
        glow(p.x, p.y, 34, '255,120,50', 0.14 * a);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  drawBadges(ctx, e) {
    const g = this.g;
    if (e.gone || (e.isUnit && e.carried)) return;
    const p = this.posOf(e);
    const pct = e.isBuilding ? e.hp / e.maxHp * 100 : e.hp;
    const air = e.isUnit && e.def.mt === 'air' ? (e.z ?? 26) : 0;
    const col = g.players[e.owner].color;
    // Team-Marker
    ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
    if (pct < 99.5) {
      const v = Math.max(1, Math.ceil(pct / 10));
      const x = p.x + 14, y = p.y + 12 - air;
      ctx.fillStyle = 'rgba(10,10,12,0.85)'; ctx.beginPath(); ctx.roundRect(x - 1, y - 1, 15, 13, 3); ctx.fill();
      ctx.fillStyle = pct > 60 ? '#8ef08a' : pct > 30 ? '#f2d35b' : '#ff6a50';
      ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(v), x + 6.5, y + 6);
    }
    if (e.isUnit && e.def.harvester && e.cargo > 0) {
      const x = p.x - 18, y = p.y + 14;
      ctx.fillStyle = 'rgba(10,10,12,0.8)'; ctx.fillRect(x, y, 14, 4);
      ctx.fillStyle = '#ff9a3c'; ctx.fillRect(x, y, 14 * e.cargo / e.def.capacity, 4);
    }
    if (e.isUnit && e.def.ammo && e.ammo <= 0) {
      ctx.fillStyle = 'rgba(255,90,60,0.95)'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText('LEER', p.x, p.y - air - 20);
    }
  }

  drawHighlights(ctx) {
    const { hl, g } = this, t = this.t;
    const fillHex = (c, r, fill, stroke, w = 2, rad = R - 2) => {
      const p = center(c, r); ctx.beginPath(); hexPath(ctx, p.x, p.y, rad);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.stroke(); }
    };

    if (hl.move) for (const n of hl.move.values()) if (n.end) fillHex(n.c, n.r, 'rgba(70,160,255,0.22)', 'rgba(120,200,255,0.55)', 1.5);
    for (const [c, r] of hl.build) fillHex(c, r, `rgba(90,230,120,${0.18 + 0.08 * Math.sin(t * 4)})`, 'rgba(120,255,150,0.7)', 1.5);
    for (const [c, r] of hl.drop) fillHex(c, r, 'rgba(90,230,230,0.2)', 'rgba(120,255,255,0.7)', 1.5);
    for (const [c, r] of hl.target) fillHex(c, r, `rgba(190,120,255,${0.16 + 0.08 * Math.sin(t * 4)})`, 'rgba(210,160,255,0.8)', 1.5);
    for (const e of hl.attack) fillHex(e.c, e.r, `rgba(255,60,40,${0.2 + 0.1 * Math.sin(t * 6)})`, 'rgba(255,90,70,0.95)', 2.5);
    if (hl.hover) fillHex(hl.hover.c, hl.hover.r, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.5)', 1.5);
    if (hl.sel) { const p = this.posOf(hl.sel); ctx.beginPath(); hexPath(ctx, center(hl.sel.c, hl.sel.r).x, center(hl.sel.c, hl.sel.r).y, R - 2); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5; ctx.stroke(); }
  }

  drawStormForecast(ctx) {
    const g = this.g; if (!g.storm) return;
    const n = g.storm.next;
    ctx.setLineDash([6, 6]); ctx.lineDashOffset = -this.t * 20;
    for (const [c, r] of ring(n.c, n.r, g.storm.rad, g.W, g.H)) {
      const p = center(c, r); ctx.beginPath(); hexPath(ctx, p.x, p.y, R - 5);
      ctx.fillStyle = 'rgba(255,140,40,0.07)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,150,60,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Bewegte Sandwellen auf allen Sandfeldern
  drawSandDrift(ctx) {
    const g = this.g;
    if (!this.sandPath || this.sandPathRound !== 1) {
      this.sandPath = new Path2D();
      for (let r = 0; r < g.H; r++) for (let c = 0; c < g.W; c++) {
        if (!g.isSand(c, r)) continue;
        const p = center(c, r), pts = [];
        for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); pts.push([p.x + (R + 1) * Math.cos(a), p.y + (R + 1) * Math.sin(a)]); }
        this.sandPath.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 6; i++) this.sandPath.lineTo(pts[i][0], pts[i][1]); this.sandPath.closePath();
      }
      this.sandPathRound = 1;
      const pc = document.createElement('canvas'); pc.width = pc.height = 256;
      const c = pc.getContext('2d');
      for (let k = 0; k < 26; k++) {
        const y0 = Math.random() * 256, amp = 3 + Math.random() * 5, ph = Math.random() * 6;
        c.strokeStyle = Math.random() < 0.5 ? 'rgba(255,238,205,0.09)' : 'rgba(120,80,40,0.08)'; c.lineWidth = 1 + Math.random() * 1.5;
        c.beginPath();
        for (let x = -10; x <= 266; x += 8) { const y = y0 + Math.sin(x / 256 * 6.283 * 2 + ph) * amp; x < 0 ? c.moveTo(x, y) : c.lineTo(x, y); }
        c.stroke();
        c.beginPath(); for (let x = -10; x <= 266; x += 8) { const y = y0 - 256 + Math.sin(x / 256 * 6.283 * 2 + ph) * amp; x < 0 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke();
      }
      this.sandPattern = ctx.createPattern(pc, 'repeat');
    }
    const off = this.t * 7;
    this.sandPattern.setTransform(new DOMMatrix([1, 0.25, -0.15, 1, off, off * 0.3]));
    ctx.save(); ctx.clip(this.sandPath); ctx.fillStyle = this.sandPattern;
    const v = this.view; ctx.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0); ctx.restore();
  }

  // Hitzeflimmern über dem Sand am Tag
  drawHeat(ctx) {
    if (this.g.dayPhase() !== 'tag' || this.cam.z < 0.7 || !this.sandPath) return;
    const v = this.view, base = this.g.map.base;
    const x0 = Math.max(0, v.x0), x1 = Math.min(base.width, v.x1), w = x1 - x0;
    if (w <= 0) return;
    ctx.save(); ctx.clip(this.sandPath); ctx.globalAlpha = 0.33;
    const step = 7;
    for (let y = Math.max(0, Math.floor(v.y0 / step) * step); y < Math.min(base.height, v.y1); y += step) {
      const dx = Math.sin(y * 0.05 + this.t * 2.8) * 1.6 + Math.sin(y * 0.013 - this.t * 1.3) * 0.8;
      ctx.drawImage(base, x0, y, w, step, x0 + dx, y - 0.6, w, step);
    }
    ctx.restore();
  }

  // Wolkenschatten ziehen langsam über die Wüste
  drawClouds(ctx, dt) {
    const ms = this.g.map.size;
    if (!this.clouds) this.clouds = Array.from({ length: 7 }, () => ({ x: Math.random() * ms.w, y: Math.random() * ms.h, r: 160 + Math.random() * 220, s: 6 + Math.random() * 8, sq: 0.5 + Math.random() * 0.3 }));
    for (const c of this.clouds) {
      c.x += c.s * dt; c.y += c.s * 0.25 * dt;
      if (c.x - c.r > ms.w) { c.x = -c.r; c.y = Math.random() * ms.h; }
      if (c.y - c.r > ms.h) c.y = -c.r;
      ctx.save(); ctx.translate(c.x, c.y); ctx.scale(1, c.sq);
      const gr = ctx.createRadialGradient(0, 0, c.r * 0.2, 0, 0, c.r);
      gr.addColorStop(0, `rgba(40,25,15,${0.13 * (1 - this.nightK)})`); gr.addColorStop(1, 'rgba(40,25,15,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, c.r, 0, 6.28); ctx.fill(); ctx.restore();
    }
  }

  // Wind: Sandschlieren über der Karte, Glutstaub in der Luft
  drawWind(ctx, dt) {
    const v = this.view;
    if (!this.windP) this.windP = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), l: 20 + Math.random() * 60, s: 0.6 + Math.random(), a: 0.04 + Math.random() * 0.08 }));
    const w = v.x1 - v.x0, h = v.y1 - v.y0;
    ctx.lineCap = 'round';
    for (const p of this.windP) {
      p.x += dt * 0.05 * p.s; p.y += dt * 0.012 * p.s;
      if (p.x > 1) { p.x -= 1; p.y = Math.random(); } if (p.y > 1) p.y -= 1;
      const x = v.x0 + p.x * w, y = v.y0 + p.y * h;
      ctx.strokeStyle = `rgba(235,200,150,${p.a})`; ctx.lineWidth = 1.2 + p.s;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - p.l * 0.5, y - 3, x - p.l, y - p.l * 0.2); ctx.stroke();
    }
  }

  drawPath(ctx) {
    const path = this.hl.path; if (!path || path.length < 2) return;
    const pts = path.map((h) => center(h.c, h.r));
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [w, col] of [[9, 'rgba(0,0,0,0.35)'], [5, 'rgba(255,255,255,0.9)']]) {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y); ctx.stroke();
    }
    const a = pts[pts.length - 1], b = pts[pts.length - 2], ang = Math.atan2(a.y - b.y, a.x - b.x);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(a.x + Math.cos(ang) * 8, a.y + Math.sin(ang) * 8);
    ctx.lineTo(a.x + Math.cos(ang + 2.4) * 10, a.y + Math.sin(ang + 2.4) * 10); ctx.lineTo(a.x + Math.cos(ang - 2.4) * 10, a.y + Math.sin(ang - 2.4) * 10); ctx.fill();
  }

  drawProjectiles(ctx) {
    for (const p of this.projectiles || []) {
      if (p.kind === 'shell') {
        ctx.fillStyle = '#ffe4a0'; ctx.beginPath(); ctx.arc(p.x, p.y - p.h, 2.5, 0, 6.28); ctx.fill();
      } else if (p.kind === 'bomb') {
        ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.ellipse(p.x, p.y - p.h, 2.5, 4, 0, 0, 6.28); ctx.fill();
      } else if (p.kind === 'rocket' || p.kind === 'arty') {
        ctx.save(); ctx.translate(p.x, p.y - p.h); ctx.rotate(p.ang || 0);
        ctx.fillStyle = '#d8d8d8'; ctx.fillRect(-5, -1.5, 9, 3);
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,170,80,0.9)'; ctx.beginPath(); ctx.arc(-6, 0, 3.5, 0, 6.28); ctx.fill();
        ctx.restore();
      }
    }
  }

  drawStorm(ctx) {
    const g = this.g; if (!g.storm) return;
    const s = g.storm, cpos = s.vis || center(s.c, s.r);
    const radPx = (s.rad + 0.6) * HW;
    const gr = ctx.createRadialGradient(cpos.x, cpos.y, radPx * 0.2, cpos.x, cpos.y, radPx);
    gr.addColorStop(0, 'rgba(140,88,45,0.72)'); gr.addColorStop(0.7, 'rgba(165,105,55,0.5)'); gr.addColorStop(1, 'rgba(170,110,60,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cpos.x, cpos.y, radPx, 0, 6.28); ctx.fill();
    if (Math.random() < 0.025) {
      const a = Math.random() * 6.28, d = Math.random() * radPx * 0.7;
      let x = cpos.x + Math.cos(a) * d, y = cpos.y + Math.sin(a) * d - 30;
      const pts = [[x, y]];
      for (let k = 0; k < 6; k++) { x += (Math.random() - 0.5) * 22; y += 8 + Math.random() * 10; pts.push([x, y]); }
      this.bolts.push({ pts, t: 0 });
      this.fx.flash(x, y, 60, '200,220,255', 0.15);
    }
    ctx.globalCompositeOperation = 'lighter';
    this.bolts = this.bolts.filter((b) => (b.t += 0.016) < 0.18);
    for (const b of this.bolts) {
      for (const [w, al] of [[5, 0.25], [1.8, 0.95]]) {
        ctx.strokeStyle = `rgba(200,225,255,${al * (1 - b.t / 0.18)})`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(b.pts[0][0], b.pts[0][1]); for (const p of b.pts) ctx.lineTo(p[0], p[1]); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(230,190,140,0.35)'; ctx.lineWidth = 1.5;
    for (const q of this.stormParticles) {
      q.a += 0.02 * q.s * (1.4 - q.d);
      const d = q.d * radPx, x = cpos.x + Math.cos(q.a) * d, y = cpos.y + Math.sin(q.a) * d * 0.85;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(q.a) * 14 * q.s, y + Math.cos(q.a) * 12 * q.s); ctx.stroke();
    }
  }

  drawFog(ctx) {
    const g = this.g;
    if (this.fogDirty || !this.fogCv) this.buildFog();
    ctx.drawImage(this.fogCv, 0, 0, g.map.size.w, g.map.size.h);
  }
  buildFog() {
    const g = this.g, S = 0.25;
    const w = Math.ceil(g.map.size.w * S), h = Math.ceil(g.map.size.h * S);
    const raw = document.createElement('canvas'); raw.width = w; raw.height = h;
    const c = raw.getContext('2d');
    c.scale(S, S);
    c.fillStyle = 'rgba(6,4,8,0.97)'; c.fillRect(0, 0, g.map.size.w, g.map.size.h);
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000';
    for (let r = 0; r < g.H; r++) for (let cc = 0; cc < g.W; cc++) {
      if (!g.explored[g.i(cc, r)]) continue;
      c.beginPath(); hexPath(c, center(cc, r).x, center(cc, r).y, R + 1); c.fill();
    }
    c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(8,6,10,0.5)';
    for (let r = 0; r < g.H; r++) for (let cc = 0; cc < g.W; cc++) {
      const i = g.i(cc, r);
      if (!g.explored[i] || g.visible[i]) continue;
      c.beginPath(); hexPath(c, center(cc, r).x, center(cc, r).y, R + 1); c.fill();
    }
    if (!this.fogCv) { this.fogCv = document.createElement('canvas'); }
    this.fogCv.width = w; this.fogCv.height = h;
    const f = this.fogCv.getContext('2d');
    if (FILTER_OK) f.filter = 'blur(2.5px)';
    f.drawImage(raw, 0, 0);
    this.fogDirty = false;
  }

  drawFloaters(ctx, dt) {
    const keep = [];
    for (const f of this.floaters) {
      f.t += dt; if (f.t > f.life) continue; keep.push(f);
      const k = f.t / f.life;
      ctx.globalAlpha = 1 - k * k;
      ctx.font = `800 ${f.big ? 18 : 14}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      const y = f.y - 20 - k * 28;
      ctx.strokeText(f.text, f.x, y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, y);
    }
    ctx.globalAlpha = 1;
    this.floaters = keep;
  }
}
