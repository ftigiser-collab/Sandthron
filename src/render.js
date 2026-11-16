// Renderer: Kamera, Gelände, Glut, Markierungen, Einheiten, Sturm, Nebel
import { center, hexPath, R, HW, ring, distance } from './hex.js';
import { drawUnit, drawBuilding, drawWormSign, drawWormMaw } from './sprites.js';
import { clamp, rgba } from './util.js';

const FILTER_OK = (() => { try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch { return false; } })();

export class Renderer {
  constructor(canvas, game, fx) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.g = game; this.fx = fx;
    this.cam = { x: 0, y: 0, z: 1 };
    this.floaters = [];
    this.hl = { move: null, attack: [], build: [], drop: [], path: null, sel: null, hover: null, forecast: null };
    this.t = 0;
    this.fogDirty = true;
    this.spiceSprites = this.makeSpiceSprites();
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

    this.drawHighlights(ctx);
    this.fx.drawDecals(ctx);

    // Gebäude
    const bs = g.buildings.filter((b) => !b.gone && g.seen(b)).sort((a, b) => a.r - b.r);
    for (const b of bs) {
      const p = this.posOf(b);
      const col = g.players[b.owner].color;
      drawBuilding(ctx, b, p.x, p.y, col, this.t, { unloading: b.unloading > 0, recoil: b.recoil || 0 });
      if (b.producing) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(p.x + 22, p.y - 22, 8, 0, 6.28); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x + 22, p.y - 22, 6, this.t * 4, this.t * 4 + 4); ctx.stroke(); }
    }

    // Wurmzeichen
    for (const w of g.worms) {
      if (w.gone) continue;
      const p = w.vis || center(w.c, w.r);
      const seen = g.wormSeen(w) || w.forceShow;
      if (w.surface > 0) drawWormMaw(ctx, p.x, p.y, this.t, w.surface);
      else if (seen) drawWormSign(ctx, p.x, p.y, this.t, 1);
    }

    // Bodeneinheiten
    const visU = g.units.filter((u) => !u.gone && !u.carried && (g.seen(u) || u.forceShow));
    const ground = visU.filter((u) => u.def.mt !== 'air').sort((a, b) => this.posOf(a).y - this.posOf(b).y);
    const air = visU.filter((u) => u.def.mt === 'air').sort((a, b) => this.posOf(a).y - this.posOf(b).y);
    for (const u of ground) this.drawUnitFull(ctx, u);
    this.fx.draw(ctx, 'ground', view);
    this.fx.draw(ctx, 'air', view);
    for (const u of air) this.drawUnitFull(ctx, u);
    this.drawProjectiles(ctx);
    this.fx.draw(ctx, 'add', view);

    this.drawStorm(ctx);
    this.drawFog(ctx);

    // Overlays nach dem Nebel
    for (const u of [...ground, ...air]) this.drawBadges(ctx, u);
    for (const b of bs) this.drawBadges(ctx, b);
    this.drawPath(ctx);
    this.drawFloaters(ctx, dt);
    this.fx.update(dt);
  }

  drawUnitFull(ctx, u) {
    const g = this.g;
    const p = this.posOf(u);
    const col = g.players[u.owner].color;
    const done = u.owner === g.current && g.current === 0 && (u.acted || (u.moved && !g.canFire(u) && !(u.def.carrier && !u.acted)));
    if (this.hl.sel === u) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, p.y + 4, 20 + Math.sin(this.t * 5), 13, 0, 0, 6.28); ctx.stroke();
    }
    ctx.save();
    if (done) { if (FILTER_OK) ctx.filter = 'saturate(0.25) brightness(0.8)'; else ctx.globalAlpha = 0.7; }
    const o = { ring: true, moving: !!u.anim, turret: u.turretRel || 0, recoil: u.recoil || 0, harvesting: u.harvestAnim > 0, z: u.def.mt === 'air' ? (u.z ?? 26) : 0 };
    if (u.def.carrier && u.carrying) {
      const c = g.get(u.carrying);
      if (c) o.carry = () => drawUnit(ctx, c, 0, 0, col, this.t, { turret: 0 });
    }
    drawUnit(ctx, u, p.x, p.y, col, this.t, o);
    ctx.restore();
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
    // Sturmvorhersage
    if (g.storm) {
      const n = g.storm.next;
      ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 20;
      for (const [c, r] of ring(n.c, n.r, g.storm.rad, g.W, g.H)) fillHex(c, r, 'rgba(255,140,40,0.07)', 'rgba(255,150,60,0.45)', 1.5, R - 5);
      ctx.setLineDash([]);
    }
    if (hl.move) for (const n of hl.move.values()) if (n.end) fillHex(n.c, n.r, 'rgba(70,160,255,0.22)', 'rgba(120,200,255,0.55)', 1.5);
    for (const [c, r] of hl.build) fillHex(c, r, `rgba(90,230,120,${0.18 + 0.08 * Math.sin(t * 4)})`, 'rgba(120,255,150,0.7)', 1.5);
    for (const [c, r] of hl.drop) fillHex(c, r, 'rgba(90,230,230,0.2)', 'rgba(120,255,255,0.7)', 1.5);
    for (const e of hl.attack) fillHex(e.c, e.r, `rgba(255,60,40,${0.2 + 0.1 * Math.sin(t * 6)})`, 'rgba(255,90,70,0.95)', 2.5);
    if (hl.hover) fillHex(hl.hover.c, hl.hover.r, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.5)', 1.5);
    if (hl.sel) { const p = this.posOf(hl.sel); ctx.beginPath(); hexPath(ctx, center(hl.sel.c, hl.sel.r).x, center(hl.sel.c, hl.sel.r).y, R - 2); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2.5; ctx.stroke(); }
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
