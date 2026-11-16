// Prozedurale Grafik: Einheiten, Gebäude, Würmer (Draufsicht, Licht von oben links)
import { shade, rgba } from './util.js';

const M = { dark: '#2e333b', mid: '#555c67', light: '#8b939e', hi: '#c3c9d1', sand: '#8a7354', glass: '#9fd8ff' };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function grad(ctx, x0, y0, x1, y1, a, b) { const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
function shadowOf(ctx, fn, dx = 4, dy = 5, a = 0.35) {
  ctx.save(); ctx.translate(dx, dy); ctx.globalAlpha *= a; ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; fn(true); ctx.restore();
}

// ---------- Einheiten ----------
export function drawUnit(ctx, u, x, y, color, t, o = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (o.ring) {
    ctx.fillStyle = rgba(color, 0.22); ctx.strokeStyle = rgba(color, 0.75); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 3, 24, 15, 0, 0, 6.28); ctx.fill(); ctx.stroke();
  }
  ctx.scale(o.scale || 1.45, o.scale || 1.45);
  const f = DRAW[u.type];
  if (f) f(ctx, u, color, t, o);
  ctx.restore();
}

function soldier(ctx, x, y, a, color, t, launcher, walking) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  const bob = walking ? Math.sin(t * 14 + x) * 0.8 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2.5, 3, 5, 4, 0, 0, 6.28); ctx.fill();
  // Waffe
  ctx.strokeStyle = '#22252a'; ctx.lineWidth = launcher ? 3.2 : 1.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(launcher ? -4 : 0, launcher ? -3 : 2.5); ctx.lineTo(launcher ? 8 : 9, launcher ? -3 : 2.5); ctx.stroke();
  // Körper (Wüstenanzug)
  ctx.fillStyle = grad(ctx, -4, -4, 4, 4, '#9a8a70', '#5e5242');
  ctx.beginPath(); ctx.ellipse(0, bob * 0.3, 3.6, 4.6, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = color; ctx.fillRect(-3.8, -1.2 + bob * 0.3, 2.2, 2.4);
  // Kopf mit Kapuze
  ctx.fillStyle = grad(ctx, -2, -2, 2, 2, '#b8a68a', '#6f6250');
  ctx.beginPath(); ctx.arc(0.8, bob * 0.3, 2.4, 0, 6.28); ctx.fill();
  ctx.fillStyle = 'rgba(160,230,255,0.85)'; ctx.fillRect(2.2, -0.9 + bob * 0.3, 1, 1.8);
  ctx.restore();
}

const DRAW = {
  inf(ctx, u, color, t, o) {
    const a = u.facing;
    const pts = [[6, 0], [-5, -7], [-5, 7]];
    for (const [px, py] of pts) {
      const ca = Math.cos(a), sa = Math.sin(a);
      soldier(ctx, px * ca - py * sa, px * sa + py * ca, a, color, t, false, o.moving);
    }
  },
  rak(ctx, u, color, t, o) {
    const a = u.facing, ca = Math.cos(a), sa = Math.sin(a);
    for (const [px, py] of [[4, -6], [-4, 6]]) soldier(ctx, px * ca - py * sa, px * sa + py * ca, a, color, t, true, o.moving);
  },
  trike(ctx, u, color, t, o) {
    ctx.rotate(u.facing);
    const body = (sh) => {
      if (!sh) { ctx.fillStyle = '#1d1f22'; }
      for (const [wx, wy, ww, wh] of [[-11, -10, 9, 5], [-11, 5, 9, 5], [8, -2.5, 7, 5]]) { rr(ctx, wx, wy, ww, wh, 2); ctx.fill(); }
      if (!sh) ctx.fillStyle = grad(ctx, 0, -7, 0, 7, M.light, M.dark);
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-3, -7); ctx.lineTo(-12, -5); ctx.lineTo(-12, 5); ctx.lineTo(-3, 7); ctx.closePath(); ctx.fill();
    };
    shadowOf(ctx, body, 3, 4);
    body(false);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-1, -4); ctx.lineTo(-1, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3b3027'; ctx.beginPath(); ctx.arc(-5, 0, 3.6, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#1a1c1f'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-3, -1.5); ctx.lineTo(9, -1.5); ctx.moveTo(-3, 1.5); ctx.lineTo(9, 1.5); ctx.stroke();
  },
  panzer(ctx, u, color, t, o) {
    ctx.rotate(u.facing);
    const tr = o.moving ? (t * 30) % 4 : 0;
    const hull = () => { rr(ctx, -15, -11, 30, 22, 4); ctx.fill(); };
    shadowOf(ctx, hull, 4, 5);
    // Ketten
    ctx.fillStyle = '#1b1d20'; rr(ctx, -16, -12, 32, 6, 2); ctx.fill(); rr(ctx, -16, 6, 32, 6, 2); ctx.fill();
    ctx.strokeStyle = '#3a3e44'; ctx.lineWidth = 1;
    for (let k = -16 + tr; k < 16; k += 4) { ctx.beginPath(); ctx.moveTo(k, -12); ctx.lineTo(k, -6); ctx.moveTo(k, 6); ctx.lineTo(k, 12); ctx.stroke(); }
    ctx.fillStyle = grad(ctx, -10, -8, 10, 8, M.light, M.mid); rr(ctx, -13, -7, 26, 14, 3); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(-13, -7, 4, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-9, -7, 20, 2);
    // Turm
    ctx.rotate(o.turret ?? 0);
    const rec = o.recoil || 0;
    ctx.fillStyle = '#25282d'; ctx.fillRect(4 - rec * 4, -1.8, 16, 3.6);
    ctx.fillStyle = '#1a1c1f'; ctx.fillRect(18 - rec * 4, -2.4, 3, 4.8);
    ctx.fillStyle = grad(ctx, -6, -6, 6, 6, M.hi, M.mid); ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, 6.28); ctx.fill();
    ctx.fillStyle = shade(color, -0.2); ctx.beginPath(); ctx.arc(-2, 0, 2.6, 0, 6.28); ctx.fill();
  },
  werfer(ctx, u, color, t, o) {
    ctx.rotate(u.facing);
    const hull = () => { rr(ctx, -14, -10, 28, 20, 4); ctx.fill(); };
    shadowOf(ctx, hull, 4, 5);
    ctx.fillStyle = '#1b1d20'; rr(ctx, -15, -11, 30, 5, 2); ctx.fill(); rr(ctx, -15, 6, 30, 5, 2); ctx.fill();
    ctx.fillStyle = grad(ctx, -10, -8, 10, 8, M.light, M.mid); rr(ctx, -13, -6.5, 26, 13, 3); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(9, -6.5, 4, 13);
    ctx.rotate(o.turret ?? 0);
    ctx.fillStyle = grad(ctx, -8, -7, 8, 7, '#6b7380', '#3a3f47'); rr(ctx, -9, -7, 15, 14, 2); ctx.fill();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = '#1a1c1f'; ctx.beginPath(); ctx.arc(3, -4 + i * 4, 1.5, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#d24d32'; ctx.beginPath(); ctx.arc(-5 + j * 4, -4 + i * 4, 1.2, 0, 6.28); ctx.fill();
    }
  },
  ernter(ctx, u, color, t, o) {
    ctx.rotate(u.facing);
    const hull = () => { rr(ctx, -18, -13, 34, 26, 5); ctx.fill(); };
    shadowOf(ctx, hull, 4, 6);
    ctx.fillStyle = '#1b1d20'; rr(ctx, -19, -14, 34, 6, 2); ctx.fill(); rr(ctx, -19, 8, 34, 6, 2); ctx.fill();
    ctx.fillStyle = grad(ctx, -14, -10, 14, 10, '#b19a6c', '#6b5a3d'); rr(ctx, -17, -9, 30, 18, 4); ctx.fill();
    // Tank mit Glutfüllung
    const fill = (u.cargo || 0) / (u.def.capacity || 1);
    ctx.fillStyle = '#3a2e22'; rr(ctx, -15, -7, 15, 14, 3); ctx.fill();
    ctx.fillStyle = `rgba(255,${120 + 40 * fill},40,${0.25 + fill * 0.7})`; rr(ctx, -14, 6 - 12 * fill, 13, 12 * fill, 2); ctx.fill();
    // Kabine
    ctx.fillStyle = color; rr(ctx, 1, -8, 8, 16, 2); ctx.fill();
    ctx.fillStyle = 'rgba(160,220,255,0.85)'; rr(ctx, 6, -5, 3, 10, 1); ctx.fill();
    // Erntewalze
    ctx.fillStyle = '#2a2d31'; rr(ctx, 13, -12, 6, 24, 2); ctx.fill();
    ctx.strokeStyle = '#8f8f8f'; ctx.lineWidth = 1.2;
    const sp = o.harvesting ? t * 40 : 0;
    for (let k = 0; k < 6; k++) { const yy = -11 + ((k * 4 + sp) % 22); ctx.beginPath(); ctx.moveTo(13, yy); ctx.lineTo(19, yy + 2); ctx.stroke(); }
  },
  libelle(ctx, u, color, t, o) { thopter(ctx, u, color, t, o, 'libelle'); },
  bomber(ctx, u, color, t, o) { thopter(ctx, u, color, t, o, 'bomber'); },
  jaeger(ctx, u, color, t, o) { thopter(ctx, u, color, t, o, 'jaeger'); },
  schwester(ctx, u, color, t, o) {
    ctx.rotate(u.facing);
    const sway = o.moving ? Math.sin(t * 9) * 0.8 : Math.sin(t * 1.5) * 0.4;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(3, 4, 9, 6, 0, 0, 6.28); ctx.fill();
    // Aura
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 14); g.addColorStop(0, 'rgba(190,120,255,0.25)'); g.addColorStop(1, 'rgba(190,120,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 6.28); ctx.fill();
    // Robe
    ctx.fillStyle = grad(ctx, -6, -6, 6, 6, '#3c2d4a', '#17111d');
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.quadraticCurveTo(2, -7 - sway, -7, -6); ctx.lineTo(-8, 6); ctx.quadraticCurveTo(2, 7 + sway, 5, 0); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-7, -5.5); ctx.lineTo(-7.6, 5.5); ctx.stroke();
    // Kapuze und Schleier
    ctx.fillStyle = '#251b2e'; ctx.beginPath(); ctx.arc(2, 0, 3.6, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(210,170,255,0.9)'; ctx.fillRect(4.6, -1.2, 1.2, 0.8); ctx.fillRect(4.6, 0.6, 1.2, 0.8);
    ctx.strokeStyle = '#c9c2b0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(8, 5); ctx.stroke();
  },
  soeldner(ctx, u, color, t, o) {
    const a = u.facing, ca = Math.cos(a), sa = Math.sin(a);
    for (const [px, py] of [[5, -5], [-4, 5]]) {
      ctx.save(); ctx.translate(px * ca - py * sa, px * sa + py * ca); ctx.rotate(a);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2.5, 3, 5.5, 4.5, 0, 0, 6.28); ctx.fill();
      ctx.strokeStyle = '#1b1d20'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 2.5); ctx.lineTo(11, 2.5); ctx.stroke();
      ctx.fillStyle = '#7fd0ff'; ctx.fillRect(9, 1.8, 2, 1.4);
      ctx.fillStyle = grad(ctx, -4, -4, 4, 4, '#a8adb5', '#4a4f57'); ctx.beginPath(); ctx.ellipse(0, 0, 4, 5, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#d4a63a'; ctx.fillRect(-4, -1.4, 2.4, 2.8);
      ctx.fillStyle = grad(ctx, -2, -2, 2, 2, '#c9ced6', '#5b616a'); ctx.beginPath(); ctx.arc(0.8, 0, 2.6, 0, 6.28); ctx.fill();
      ctx.fillStyle = 'rgba(255,200,90,0.95)'; ctx.fillRect(2.4, -1, 1, 2);
      ctx.restore();
    }
  },
  falke(ctx, u, color, t, o) { thopter(ctx, u, color, t, o, 'falke'); },
  traeger(ctx, u, color, t, o) { thopter(ctx, u, color, t, o, 'traeger'); },
};

function wings(ctx, x, y, len, wid, a, flap, alpha = 1) {
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(s * a);
    const L = len * flap;
    const g = ctx.createLinearGradient(0, 0, 0, s * L);
    g.addColorStop(0, `rgba(210,225,235,${0.85 * alpha})`); g.addColorStop(1, `rgba(170,190,205,${0.35 * alpha})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-wid * 0.3, 0); ctx.quadraticCurveTo(-wid, s * L * 0.6, -wid * 0.2, s * L); ctx.quadraticCurveTo(wid * 0.6, s * L * 0.7, wid * 0.4, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(60,70,80,${0.5 * alpha})`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-wid * 0.15, s * L * 0.95); ctx.stroke();
    ctx.restore();
  }
}

function thopter(ctx, u, color, t, o, kind) {
  const z = o.z ?? 26;
  const flapRate = kind === 'traeger' || kind === 'bomber' ? 12 : kind === 'jaeger' ? 24 : 19;
  const ph = t * flapRate + u.id;
  const flapA = 0.55 + 0.45 * Math.abs(Math.sin(ph));
  const flapB = 0.55 + 0.45 * Math.abs(Math.sin(ph + 1.3));
  const big = kind === 'traeger' ? 1.25 : kind === 'bomber' ? 1.3 : kind === 'falke' ? 1.1 : kind === 'jaeger' ? 1.0 : 0.95;
  // Bodenschatten
  ctx.save(); ctx.translate(z * 0.35, z * 0.45); ctx.rotate(u.facing); ctx.scale(big, big);
  ctx.fillStyle = `rgba(0,0,0,${0.28 - z * 0.003})`;
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 5, 0, 0, 6.28); ctx.fill();
  ctx.beginPath(); ctx.ellipse(2, 0, 3, 16 * flapA, 0, 0, 6.28); ctx.ellipse(-6, 0, 2.5, 12 * flapB, 0, 0, 6.28); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(0, -z); ctx.rotate(u.facing); ctx.scale(big, big);
  // Träger: getragene Einheit
  if (kind === 'traeger' && o.carry) {
    ctx.save(); ctx.scale(0.62, 0.62); ctx.rotate(-u.facing); o.carry(); ctx.restore();
  }
  // Flügel (hinten zuerst)
  wings(ctx, -6, 0, kind === 'traeger' ? 15 : 13, 6, 0.25, flapB, 0.9);
  // Motion-Blur-Fächer
  ctx.fillStyle = 'rgba(200,220,235,0.08)';
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.arc(2, 0, 19, -1.9, -1.2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.arc(2, 0, 19, 1.2, 1.9); ctx.closePath(); ctx.fill();
  // Rumpf
  if (kind === 'traeger') {
    ctx.fillStyle = grad(ctx, 0, -6, 0, 6, M.light, M.dark); rr(ctx, -13, -5, 26, 10, 3); ctx.fill();
    ctx.strokeStyle = '#2a2d31'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(-9, 8); ctx.moveTo(7, -8); ctx.lineTo(7, 8); ctx.stroke();
    ctx.fillStyle = color; ctx.fillRect(-13, -5, 3, 10);
    ctx.fillStyle = M.glass; ctx.beginPath(); ctx.ellipse(11, 0, 4, 3.6, 0, 0, 6.28); ctx.fill();
  } else if (kind === 'bomber') {
    ctx.fillStyle = grad(ctx, 0, -7, 0, 7, M.light, M.dark);
    ctx.beginPath(); ctx.moveTo(15, 0); ctx.quadraticCurveTo(12, -7, 0, -7); ctx.lineTo(-14, -4); ctx.lineTo(-17, 0); ctx.lineTo(-14, 4); ctx.lineTo(0, 7); ctx.quadraticCurveTo(12, 7, 15, 0); ctx.fill();
    ctx.fillStyle = '#23262b'; rr(ctx, -9, -3.5, 12, 7, 2); ctx.fill();
    const ammo = u.ammo ?? 2;
    for (let k = 0; k < 2; k++) { ctx.fillStyle = k < ammo ? '#c8b26a' : '#3a3a3a'; ctx.beginPath(); ctx.ellipse(-6 + k * 6, 0, 2.4, 2, 0, 0, 6.28); ctx.fill(); }
    ctx.fillStyle = color; ctx.fillRect(-14, -3, 4, 6);
    ctx.fillStyle = M.glass; ctx.beginPath(); ctx.ellipse(10, 0, 4, 4, 0, 0, 6.28); ctx.fill();
  } else if (kind === 'jaeger') {
    ctx.fillStyle = grad(ctx, 0, -4, 0, 4, M.hi, M.mid);
    ctx.beginPath(); ctx.moveTo(17, 0); ctx.lineTo(2, -3.6); ctx.lineTo(-13, -2); ctx.lineTo(-16, -5); ctx.lineTo(-17, 0); ctx.lineTo(-16, 5); ctx.lineTo(-13, 2); ctx.lineTo(2, 3.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(-12, -1.2, 18, 2.4);
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(-2, -7, 9, 1.6); ctx.fillRect(-2, 5.4, 9, 1.6);
    ctx.fillStyle = '#e0533a'; ctx.fillRect(7, -7, 1.6, 1.6); ctx.fillRect(7, 5.4, 1.6, 1.6);
    ctx.fillStyle = M.glass; ctx.beginPath(); ctx.ellipse(9, 0, 3.6, 2.6, 0, 0, 6.28); ctx.fill();
  } else {
    const L = kind === 'falke' ? 15 : 14;
    ctx.fillStyle = grad(ctx, 0, -5, 0, 5, M.hi, M.mid);
    ctx.beginPath(); ctx.moveTo(L, 0); ctx.quadraticCurveTo(L * 0.6, -5, -2, -4.2); ctx.lineTo(-L, -1.5); ctx.lineTo(-L - 3, 0); ctx.lineTo(-L, 1.5); ctx.lineTo(-2, 4.2); ctx.quadraticCurveTo(L * 0.6, 5, L, 0); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(-L + 1, -1.6, 6, 3.2);
    ctx.fillStyle = M.glass; ctx.beginPath(); ctx.ellipse(L * 0.55, 0, 4.2, 3.2, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(L * 0.55 + 1, -1, 1.6, 1, 0, 0, 6.28); ctx.fill();
    if (kind === 'falke') {
      ctx.fillStyle = '#30343a';
      rr(ctx, -2, -8, 9, 3, 1.2); ctx.fill(); rr(ctx, -2, 5, 9, 3, 1.2); ctx.fill();
      const ammo = u.ammo ?? 3;
      for (let k = 0; k < 3; k++) { ctx.fillStyle = k < ammo ? '#e0533a' : '#444'; ctx.fillRect(5, k === 0 ? -7.5 : k === 1 ? 5.5 : -0.8, 2, 2); }
    } else {
      ctx.strokeStyle = '#22252a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(L - 1, 2.5); ctx.lineTo(L + 5, 2.5); ctx.stroke();
    }
  }
  // Vorderflügel
  wings(ctx, 2, 0, kind === 'traeger' ? 17 : kind === 'bomber' ? 19 : kind === 'jaeger' ? 14 : kind === 'falke' ? 17 : 16, kind === 'jaeger' ? 5 : 7, kind === 'jaeger' ? -0.5 : -0.15, flapA, 1);
  ctx.restore();
}

// ---------- Gebäude ----------
function foundation(ctx, r, color) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  hexP(ctx, 4, 5, r); ctx.fill();
  ctx.fillStyle = grad(ctx, -r, -r, r, r, '#8d8478', '#5a534a');
  hexP(ctx, 0, 0, r); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.5; hexP(ctx, 0, 0, r - 1); ctx.stroke();
  ctx.strokeStyle = rgba(color, 0.7); ctx.lineWidth = 2; ctx.setLineDash([5, 4]); hexP(ctx, 0, 0, r - 4); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
}
function hexP(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); const px = x + r * Math.cos(a), py = y + r * Math.sin(a); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
}
function box(ctx, x, y, w, h, top, side, r = 3, height = 5) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, x + height * 0.8, y + height, w, h, r); ctx.fill();
  ctx.fillStyle = side; rr(ctx, x, y + height * 0.5, w, h, r); ctx.fill();
  ctx.fillStyle = top; rr(ctx, x, y, w, h, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + r, y + 1, w - r * 2, 2);
}
function dome(ctx, x, y, r, col, glow) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(x + r * 0.35, y + r * 0.45, r, 0, 6.28); ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, shade(col, 0.45)); g.addColorStop(1, shade(col, -0.35));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill();
  if (glow) { ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 6.28); ctx.fill(); }
}

export function drawBuilding(ctx, b, x, y, color, t, o = {}) {
  ctx.save(); ctx.translate(x, y);
  const rise = b.rise ?? 1;
  foundation(ctx, 33, color);
  if (b.turnsLeft > 0) {
    // Baustelle
    ctx.strokeStyle = 'rgba(240,200,80,0.9)'; ctx.lineWidth = 1.5;
    for (let k = -18; k <= 18; k += 9) { ctx.beginPath(); ctx.moveTo(k, -18); ctx.lineTo(k, 18); ctx.moveTo(-18, k); ctx.lineTo(18, k); ctx.stroke(); }
    ctx.fillStyle = 'rgba(40,40,40,0.5)'; ctx.fillRect(-18, -18, 36, 36);
    const prog = 1 - b.turnsLeft / Math.max(1, b.def.turns);
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.08, prog)); ctx.stroke();
    // Kran
    ctx.save(); ctx.rotate(t * 0.4); ctx.fillStyle = '#e2b13c'; ctx.fillRect(-2, -2, 24, 4); ctx.fillStyle = '#333'; ctx.fillRect(18, -1, 2, 8); ctx.restore();
    ctx.restore(); return;
  }
  ctx.scale(0.75 + 0.25 * rise, 0.75 + 0.25 * rise);
  const f = BDRAW[b.type]; if (f) f(ctx, b, color, t, o);
  ctx.restore();
}

const BDRAW = {
  bauhof(ctx, b, color, t) {
    box(ctx, -22, -18, 44, 34, grad(ctx, 0, -18, 0, 16, '#9aa1aa', '#5b626b'), '#3d4249', 5, 6);
    box(ctx, -10, -24, 20, 14, '#b9c0c8', '#5b626b', 3, 4);
    ctx.fillStyle = color; ctx.fillRect(-22, 8, 44, 4);
    ctx.fillStyle = '#2a2e33'; rr(ctx, -14, -6, 28, 12, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,0.75)'; for (let k = 0; k < 4; k++) ctx.fillRect(-12 + k * 7, -3, 4, 2);
    ctx.save(); ctx.translate(14, -14); ctx.rotate(Math.sin(t * 0.3) * 0.8 + 0.6);
    ctx.fillStyle = '#e2b13c'; ctx.fillRect(-2, -2, 26, 4); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(22, -1, 2, 7);
    ctx.fillStyle = '#c99a2e'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.28); ctx.fill(); ctx.restore();
  },
  windfalle(ctx, b, color, t) {
    dome(ctx, -12, 10, 8, '#7d8792'); dome(ctx, 12, 10, 8, '#7d8792');
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(4, 2, 14, 0, 6.28); ctx.fill();
    const g = ctx.createRadialGradient(-5, -9, 2, 0, -4, 15); g.addColorStop(0, '#c9d0d8'); g.addColorStop(1, '#4c535c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -4, 14, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#23272c'; ctx.beginPath(); ctx.arc(0, -4, 10, 0, 6.28); ctx.fill();
    ctx.save(); ctx.translate(0, -4); ctx.rotate(t * 3);
    for (let k = 0; k < 3; k++) { ctx.rotate(Math.PI * 2 / 3); ctx.fillStyle = '#aab3bd'; ctx.beginPath(); ctx.ellipse(5, 0, 5, 2, 0.3, 0, 6.28); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -4, 2.5, 0, 6.28); ctx.fill();
    ctx.fillStyle = 'rgba(120,200,255,0.8)'; ctx.fillRect(-14, 9, 4, 2); ctx.fillRect(10, 9, 4, 2);
  },
  raffinerie(ctx, b, color, t, o) {
    box(ctx, -24, -6, 30, 22, grad(ctx, 0, -6, 0, 16, '#a39a8a', '#655d50'), '#433d35', 4, 5);
    const pulse = 0.5 + 0.5 * Math.sin(t * 3);
    dome(ctx, 13, -10, 10, '#8a8f96', `rgba(255,${130 + pulse * 40},40,${0.55 + (o.unloading ? 0.4 : 0)})`);
    dome(ctx, 13, 12, 8, '#8a8f96', 'rgba(255,140,50,0.5)');
    ctx.strokeStyle = '#3a3f46'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(4, 2); ctx.lineTo(13, -2); ctx.moveTo(4, 8); ctx.lineTo(10, 10); ctx.stroke();
    ctx.fillStyle = color; ctx.fillRect(-24, -6, 4, 22);
    ctx.fillStyle = '#2a2e33'; rr(ctx, -16, 0, 16, 10, 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,80,0.8)'; ctx.lineWidth = 1; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-14, 2 + k * 3); ctx.lineTo(-2, 2 + k * 3); ctx.stroke(); }
  },
  kaserne(ctx, b, color, t) {
    box(ctx, -20, -14, 40, 28, grad(ctx, 0, -14, 0, 14, '#a79f8f', '#6d6455'), '#463f36', 4, 5);
    ctx.fillStyle = '#7b7264'; for (let k = 0; k < 5; k++) ctx.fillRect(-18, -12 + k * 5.4, 36, 2.4);
    ctx.fillStyle = '#2a2e33'; ctx.fillRect(-5, 10, 10, 5);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(16, -12); ctx.lineTo(16, -26); ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(16, -26); ctx.quadraticCurveTo(22, -24 + Math.sin(t * 4) * 1.5, 27, -23); ctx.lineTo(16, -19); ctx.closePath(); ctx.fill();
  },
  fabrik(ctx, b, color, t) {
    box(ctx, -26, -20, 52, 38, grad(ctx, 0, -20, 0, 18, '#9aa1aa', '#585f68'), '#3a3f46', 5, 6);
    ctx.fillStyle = '#4a5058'; for (let k = 0; k < 6; k++) ctx.fillRect(-24 + k * 8.5, -18, 6, 20);
    ctx.fillStyle = '#23272c'; rr(ctx, -14, 6, 28, 12, 2); ctx.fill();
    ctx.fillStyle = '#e2b13c'; for (let k = 0; k < 7; k++) ctx.fillRect(-14 + k * 4, 16, 2, 2);
    ctx.fillStyle = color; ctx.fillRect(-26, 2, 52, 3);
    dome(ctx, 18, -14, 5, '#666d76');
  },
  ausguck(ctx, b, color, t) {
    box(ctx, -14, -10, 28, 24, grad(ctx, 0, -10, 0, 14, '#a1a8b1', '#5b626b'), '#3b4047', 4, 5);
    ctx.fillStyle = color; ctx.fillRect(-14, 10, 28, 3);
    ctx.save(); ctx.translate(0, -6); ctx.rotate(t * 1.2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(4, 6, 15, 5, 0, 0, 6.28); ctx.fill();
    const g = ctx.createLinearGradient(0, -6, 0, 6); g.addColorStop(0, '#dfe4ea'); g.addColorStop(1, '#7c848e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 16, 6, 0, 0, 6.28); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -10); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = `rgba(255,80,60,${0.5 + 0.5 * Math.sin(t * 5)})`; ctx.beginPath(); ctx.arc(10, 8, 1.8, 0, 6.28); ctx.fill();
  },
  horst(ctx, b, color, t) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(3, 4, 24, 0, 6.28); ctx.fill();
    ctx.fillStyle = grad(ctx, -20, -20, 20, 20, '#7f8790', '#4a5058'); ctx.beginPath(); ctx.arc(0, 0, 24, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(240,210,120,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 18, 0, 6.28); ctx.stroke();
    ctx.fillStyle = color; for (let k = 0; k < 3; k++) { ctx.save(); ctx.rotate(k * Math.PI * 2 / 3 + 0.3); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.closePath(); ctx.fill(); ctx.restore(); }
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; const on = Math.floor(t * 6) % 8 === k; ctx.fillStyle = on ? 'rgba(160,240,255,1)' : 'rgba(90,140,160,0.6)'; ctx.beginPath(); ctx.arc(Math.cos(a) * 22, Math.sin(a) * 22, on ? 2.2 : 1.4, 0, 6.28); ctx.fill(); }
    box(ctx, 14, -26, 12, 12, '#a5acb5', '#50565e', 2, 4);
    ctx.fillStyle = M.glass; ctx.fillRect(16, -24, 8, 3);
  },
  kontor(ctx, b, color, t) {
    box(ctx, -20, -10, 40, 26, grad(ctx, 0, -10, 0, 16, '#8f8a99', '#4d4956'), '#36333d', 5, 6);
    ctx.fillStyle = '#d4a63a'; ctx.beginPath(); ctx.arc(-8, 3, 6, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#2a2730'; ctx.beginPath(); ctx.arc(-8, 3, 3.5, 0, 6.28); ctx.fill();
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28 + t * 0.5; ctx.fillStyle = '#f2d27a'; ctx.beginPath(); ctx.arc(-8 + Math.cos(a) * 8.5, 3 + Math.sin(a) * 8.5, 1.1, 0, 6.28); ctx.fill(); }
    ctx.fillStyle = color; ctx.fillRect(-20, 12, 40, 3);
    // Sendeantenne
    ctx.strokeStyle = '#2c2c30'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(10, 4); ctx.lineTo(10, -26); ctx.stroke();
    ctx.save(); ctx.translate(10, -14); ctx.rotate(Math.sin(t * 0.6) * 0.5);
    ctx.fillStyle = grad(ctx, -10, 0, 10, 0, '#e2e6ec', '#7d848e'); ctx.beginPath(); ctx.ellipse(0, 0, 11, 4, 0, 0, 6.28); ctx.fill(); ctx.restore();
    const pulse = (t * 0.8) % 1;
    ctx.strokeStyle = `rgba(255,220,130,${1 - pulse})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(10, -26, 3 + pulse * 18, 0, 6.28); ctx.stroke();
  },
  konvent(ctx, b, color, t) {
    for (let k = 0; k < 6; k++) { const a = k / 6 * 6.28; box(ctx, Math.cos(a) * 18 - 3, Math.sin(a) * 18 - 3, 6, 6, '#6e6478', '#3b3443', 2, 3); }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(4, 5, 16, 0, 6.28); ctx.fill();
    const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, 16); g.addColorStop(0, '#b6a6c6'); g.addColorStop(1, '#3a2f46');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 16, 0, 6.28); ctx.fill();
    ctx.strokeStyle = 'rgba(30,20,40,0.6)'; ctx.lineWidth = 1;
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.stroke(); }
    const pl = 0.5 + 0.5 * Math.sin(t * 2);
    const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, 8); g2.addColorStop(0, `rgba(210,150,255,${0.6 + pl * 0.4})`); g2.addColorStop(1, 'rgba(210,150,255,0)');
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 6.28); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 17, 0.3, 1.2); ctx.stroke();
  },
  turm(ctx, b, color, t, o) {
    dome(ctx, 0, 0, 15, '#7b838d');
    ctx.save(); ctx.rotate(b.facing);
    const rec = o.recoil || 0;
    ctx.fillStyle = '#202327'; ctx.fillRect(4 - rec * 4, -2.5, 20, 5);
    ctx.fillStyle = grad(ctx, -8, -8, 8, 8, '#c2c8cf', '#5b626b'); rr(ctx, -9, -8, 16, 16, 3); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(-9, -8, 3, 16);
    ctx.restore();
  },
  flak(ctx, b, color, t, o) {
    dome(ctx, 0, 0, 14, '#7b838d');
    ctx.save(); ctx.rotate(b.facing);
    ctx.fillStyle = '#202327'; ctx.fillRect(2, -5, 18, 3); ctx.fillRect(2, 2, 18, 3);
    ctx.fillStyle = grad(ctx, -8, -8, 8, 8, '#c2c8cf', '#5b626b'); ctx.beginPath(); ctx.arc(0, 0, 8, 0, 6.28); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(-2, 0, 3, 0, 6.28); ctx.fill();
    ctx.restore();
  },
};

// ---------- Wurm ----------
export function drawWormSign(ctx, x, y, t, a = 1) {
  ctx.save(); ctx.translate(x, y);
  for (let k = 0; k < 4; k++) {
    const ph = (t * 0.8 + k / 4) % 1;
    ctx.strokeStyle = `rgba(120,80,40,${(1 - ph) * 0.5 * a})`; ctx.lineWidth = 3 * (1 - ph) + 1;
    ctx.beginPath(); ctx.ellipse(0, 0, 6 + ph * 30, 4 + ph * 22, 0.4, 0, 6.28); ctx.stroke();
  }
  ctx.fillStyle = `rgba(110,75,40,${0.4 * a})`; ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0.4, 0, 6.28); ctx.fill();
  ctx.restore();
}

export function drawWormMaw(ctx, x, y, t, k) {
  // k: 0..1 Auftauchen
  ctx.save(); ctx.translate(x, y - 10 * k);
  const R = 30 * k;
  ctx.fillStyle = `rgba(0,0,0,${0.35 * k})`; ctx.beginPath(); ctx.ellipse(10, 18, R * 1.1, R * 0.7, 0, 0, 6.28); ctx.fill();
  // Körpersegmente
  for (let s = 3; s >= 0; s--) {
    const rr2 = R * (1.15 + s * 0.12);
    const g = ctx.createRadialGradient(-rr2 * 0.3, -rr2 * 0.3, rr2 * 0.2, 0, s * 4, rr2);
    g.addColorStop(0, '#b08a62'); g.addColorStop(1, '#4e3826');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, s * 4, rr2, 0, 6.28); ctx.fill();
  }
  // Schlund
  const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  g2.addColorStop(0, '#120806'); g2.addColorStop(0.7, '#3a1a10'); g2.addColorStop(1, '#7a3a20');
  ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(0, 0, R * 0.92, 0, 6.28); ctx.fill();
  // Zahnkränze
  for (let ring = 0; ring < 3; ring++) {
    const rad = R * (0.85 - ring * 0.22), n = 18 - ring * 4;
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.28 + t * (ring % 2 ? 0.6 : -0.4);
      ctx.fillStyle = ring === 0 ? '#e8dcc0' : '#bfae8c';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.12) * rad, Math.sin(a - 0.12) * rad);
      ctx.lineTo(Math.cos(a) * (rad - 6 * k), Math.sin(a) * (rad - 6 * k));
      ctx.lineTo(Math.cos(a + 0.12) * rad, Math.sin(a + 0.12) * rad);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- Kachel-Icons für das Menü ----------
const iconCache = new Map();
export function icon(kind, type, color) {
  const key = kind + type + color;
  if (iconCache.has(key)) return iconCache.get(key);
  const cv = document.createElement('canvas'); cv.width = 120; cv.height = 90;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 90); g.addColorStop(0, '#d8b07a'); g.addColorStop(1, '#a87a48');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 120, 90);
  ctx.save(); ctx.translate(60, 50); ctx.scale(1.55, 1.55);
  if (kind === 'unit') {
    const fake = { type, def: { capacity: 1, mt: '' }, facing: -0.5, id: 3, cargo: 0.6, ammo: 3 };
    drawUnit(ctx, fake, 0, type === 'libelle' || type === 'falke' || type === 'traeger' ? 8 : 0, color, 0.3, { z: 10, turret: 0 });
  } else {
    drawBuilding(ctx, { type, turnsLeft: 0, def: {}, facing: -0.6, rise: 1 }, 0, 0, color, 0.7, {});
  }
  ctx.restore();
  const v = ctx.createRadialGradient(60, 45, 30, 60, 45, 75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, 120, 90);
  iconCache.set(key, cv);
  return cv;
}

// ---------- Drop-Kapsel, Klopfer, Karten ----------
export function drawPod(ctx, x, y, h, open, color, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = `rgba(0,0,0,${0.35 * (1 - Math.min(1, h / 300))})`; ctx.beginPath(); ctx.ellipse(0, 4, 14, 7, 0, 0, 6.28); ctx.fill();
  ctx.translate(0, -h);
  if (open > 0) {
    for (let k = 0; k < 4; k++) {
      ctx.save(); ctx.rotate(k * Math.PI / 2 + 0.785); ctx.translate(0, -4 - open * 8); ctx.rotate(open * 0.6);
      ctx.fillStyle = grad(ctx, -6, -10, 6, 0, '#9aa0a8', '#4a4f57'); ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(0, -12); ctx.lineTo(6, 0); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#2a2a2e'; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 6.28); ctx.fill();
  } else {
    const g = ctx.createLinearGradient(-8, 0, 8, 0); g.addColorStop(0, '#c9ced6'); g.addColorStop(1, '#4d535c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(9, 6); ctx.lineTo(-9, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = color; ctx.fillRect(-6, 0, 12, 3);
    if (h > 5) {
      ctx.globalCompositeOperation = 'lighter';
      const fg = ctx.createRadialGradient(0, 8, 1, 0, 8, 16); fg.addColorStop(0, 'rgba(255,220,150,0.95)'); fg.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(0, 8, 16, 0, 6.28); ctx.fill();
    }
  }
  ctx.restore();
}

export function drawThumper(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  for (let k = 0; k < 3; k++) {
    const ph = (t * 1.2 + k / 3) % 1;
    ctx.strokeStyle = `rgba(255,200,120,${(1 - ph) * 0.6})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 2, 6 + ph * 34, 4 + ph * 22, 0, 0, 6.28); ctx.stroke();
  }
  const bob = Math.abs(Math.sin(t * 6)) * 3;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(3, 4, 5, 3, 0, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#5b616a'; ctx.fillRect(-1.5, -16, 3, 18);
  ctx.fillStyle = '#c7a24a'; ctx.fillRect(-4, -18 + bob, 8, 5);
  ctx.restore();
}

const cardCache = new Map();
export function cardArt(id) {
  if (cardCache.has(id)) return cardCache.get(id);
  const cv = document.createElement('canvas'); cv.width = 120; cv.height = 80;
  const c = cv.getContext('2d');
  const bg = c.createRadialGradient(60, 40, 5, 60, 40, 80); bg.addColorStop(0, '#4a3358'); bg.addColorStop(1, '#160f1c');
  c.fillStyle = bg; c.fillRect(0, 0, 120, 80);
  c.strokeStyle = 'rgba(220,180,255,0.9)'; c.fillStyle = 'rgba(220,180,255,0.9)'; c.lineWidth = 2.5; c.lineCap = 'round';
  c.translate(60, 40);
  const sym = {
    stimme() { for (let k = 1; k <= 3; k++) { c.beginPath(); c.arc(-14, 0, k * 9, -0.7, 0.7); c.stroke(); } c.beginPath(); c.arc(-20, 0, 5, 0, 6.28); c.fill(); },
    vorahnung() { c.beginPath(); c.ellipse(0, 0, 26, 13, 0, 0, 6.28); c.stroke(); c.beginPath(); c.arc(0, 0, 8, 0, 6.28); c.fill(); c.fillStyle = '#160f1c'; c.beginPath(); c.arc(0, 0, 3, 0, 6.28); c.fill(); },
    wetter() { for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(0, 0, 8 + k * 8, k, k + 4); c.stroke(); } },
    klopfer() { c.fillRect(-2, -22, 4, 30); c.fillRect(-7, -24, 14, 6); for (let k = 1; k <= 2; k++) { c.beginPath(); c.ellipse(0, 12, 12 * k, 4 * k, 0, 0, 6.28); c.stroke(); } },
    verrat() { c.beginPath(); c.moveTo(-20, 10); c.lineTo(0, -14); c.lineTo(20, 10); c.stroke(); c.beginPath(); c.moveTo(-8, 4); c.lineTo(8, 4); c.stroke(); c.beginPath(); c.arc(0, -14, 4, 0, 6.28); c.fill(); },
    schild() { c.beginPath(); c.moveTo(0, -22); c.lineTo(18, -12); c.lineTo(14, 10); c.lineTo(0, 22); c.lineTo(-14, 10); c.lineTo(-18, -12); c.closePath(); c.stroke(); },
    sabotage() { c.beginPath(); c.arc(0, 4, 13, 0, 6.28); c.stroke(); c.beginPath(); c.moveTo(8, -6); c.quadraticCurveTo(16, -18, 22, -16); c.stroke(); c.fillStyle = '#ffb35a'; c.beginPath(); c.arc(22, -16, 3, 0, 6.28); c.fill(); },
    gilde() { c.beginPath(); c.arc(0, 0, 18, 0, 6.28); c.stroke(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; c.beginPath(); c.arc(Math.cos(a) * 24, Math.sin(a) * 24, 2, 0, 6.28); c.fill(); } c.beginPath(); c.arc(0, 0, 6, 0, 6.28); c.fill(); },
  }[id];
  if (sym) sym();
  cardCache.set(id, cv);
  return cv;
}
