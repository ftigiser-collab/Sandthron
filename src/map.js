// Prozedurale Hexkarte und vorgerendertes Gelände
import { Noise, clamp, smoothstep } from './util.js';
import { center, neighbors, distance, worldSize, pixelToHex, R, HW } from './hex.js';
import { MOVE_COST } from './data.js';

export function generateMap(seed, W = 30, H = 22) {
  const N = new Noise(seed), N2 = new Noise(seed + 7), N3 = new Noise(seed + 13), N4 = new Noise(seed + 29);
  const starts = [{ c: 4, r: 4 }, { c: W - 5, r: H - 5 }];
  const ter = new Array(W * H), spice = new Float32Array(W * H);
  const idx = (c, r) => r * W + c;

  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const p = center(c, r), x = p.x / HW, y = p.y / HW;
    let v = N.fbm(x / 5.2, y / 5.2, 4) * 1.1 - 0.03;
    let dmin = 99;
    for (const s of starts) {
      const d = distance(c, r, s.c, s.r); dmin = Math.min(dmin, d);
      if (d <= 3) v = Math.max(v, 0.64);
      else if (d === 4) v = Math.max(v, 0.56 + (N4.v(x, y) - 0.5) * 0.2);
    }
    let t = v > 0.76 ? 'mountain' : v > 0.6 ? 'rock' : 'sand';
    if (dmin <= 3) t = 'rock';
    if (t === 'sand') {
      const dn = N3.fbm(x / 3.2 + 10, y / 3.2, 3);
      if (dn > 0.58) t = 'dune';
    }
    ter[idx(c, r)] = t;
  }

  // Glutfelder: garantiert nahe jeder Basis + Mitte + Rauschen
  const fields = [];
  const mid = { c: W / 2, r: H / 2 };
  for (const s of starts) {
    const dc = mid.c - s.c, dr = mid.r - s.r, l = Math.hypot(dc, dr);
    fields.push({ c: Math.round(s.c + dc / l * 5.5), r: Math.round(s.r + dr / l * 5.5), rad: 2 });
    fields.push({ c: Math.round(s.c + dr / l * 6), r: Math.round(s.r - dc / l * 4), rad: 1 });
  }
  fields.push({ c: Math.round(mid.c), r: Math.round(mid.r), rad: 2 });
  for (const f of fields) {
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      if (distance(c, r, f.c, f.r) > f.rad) continue;
      if (starts.some((s) => distance(c, r, s.c, s.r) <= 3)) continue;
      const i = idx(c, r);
      if (ter[i] === 'rock' || ter[i] === 'mountain') ter[i] = 'sand';
      spice[i] = Math.max(spice[i], 450 + Math.round(N4.v(c, r) * 250));
    }
  }
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const i = idx(c, r);
    if (ter[i] !== 'sand' && ter[i] !== 'dune') continue;
    const p = center(c, r);
    const s = N2.fbm(p.x / HW / 2.5, p.y / HW / 2.5, 3);
    if (s > 0.62) spice[i] = Math.max(spice[i], Math.round(250 + (s - 0.62) * 2000));
  }

  // Fahrzeug-Verbindung zwischen den Basen sicherstellen
  if (!reachable(ter, W, H, starts[0], starts[1])) carve(ter, W, H, starts[0], starts[1]);

  const map = { W, H, seed, ter, spice, starts, idx };
  map.size = worldSize(W, H);
  map.base = renderBase(map, N3, N4);
  return map;
}

function reachable(ter, W, H, a, b) {
  const seen = new Uint8Array(W * H), q = [[a.c, a.r]];
  seen[a.r * W + a.c] = 1;
  while (q.length) {
    const [c, r] = q.pop();
    if (c === b.c && r === b.r) return true;
    for (const [nc, nr] of neighbors(c, r, W, H)) {
      const i = nr * W + nc;
      if (!seen[i] && MOVE_COST.track[ter[i]] < Infinity) { seen[i] = 1; q.push([nc, nr]); }
    }
  }
  return false;
}

function carve(ter, W, H, a, b) {
  let c = a.c, r = a.r;
  for (let k = 0; k < 200 && !(c === b.c && r === b.r); k++) {
    let best = null, bd = 1e9;
    for (const [nc, nr] of neighbors(c, r, W, H)) { const d = distance(nc, nr, b.c, b.r); if (d < bd) { bd = d; best = [nc, nr]; } }
    [c, r] = best;
    if (ter[r * W + c] === 'mountain') ter[r * W + c] = 'rock';
  }
}

// Gelände als Bild: weiche, organische Übergänge, Höhenschattierung
function renderBase(map, N3, N4) {
  const { W, H, ter } = map;
  const S = 0.5;
  const w = Math.ceil(map.size.w * S), h = Math.ceil(map.size.h * S);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  const height = new Float32Array(w * h), rockW = new Float32Array(w * h), mtnW = new Float32Array(w * h);
  const W_R = { sand: 0, dune: 0, rock: 1, mountain: 1 }, W_M = { sand: 0, dune: 0, rock: 0, mountain: 1 }, W_D = { sand: 0, dune: 1, rock: 0, mountain: 0 };

  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const X = px / S, Y = py / S;
    // Domain-Warp für wellige Grenzen
    const wx = X + (N4.v(X / 40, Y / 40) - 0.5) * 22, wy = Y + (N4.v(X / 40 + 50, Y / 40) - 0.5) * 22;
    const hx = pixelToHex(wx, wy);
    let sr = 0, sm = 0, sd = 0, sw = 0;
    const cand = [[hx.col, hx.row], ...neighbors(clamp(hx.col, 0, W - 1), clamp(hx.row, 0, H - 1), W, H)];
    for (const [c, r] of cand) {
      if (c < 0 || r < 0 || c >= W || r >= H) continue;
      const p = center(c, r);
      const d = Math.hypot(wx - p.x, wy - p.y);
      let k = 1 - d / (R * 1.25); if (k <= 0) continue;
      k = k * k * k;
      const t = ter[r * W + c];
      sr += W_R[t] * k; sm += W_M[t] * k; sd += W_D[t] * k; sw += k;
    }
    if (sw === 0) { sw = 1; }
    const rk = sr / sw, mt = sm / sw, du = sd / sw;
    const x = X / HW, y = Y / HW;
    const u = (x * 0.8 + y * 0.6) * 2.6, vv = (-x * 0.6 + y * 0.8) * 0.9;
    const n = N3.fbm(u + N3.v(vv, u * 0.2) * 0.8, vv, 3);
    const ridge = 1 - Math.abs(2 * n - 1);
    const sandH = ridge * ridge * (0.06 + du * 0.3) + N4.fbm(x * 1.6, y * 1.6, 2) * 0.08;
    const rockH = 0.32 + N4.fbm(x * 5, y * 5, 3) * 0.2;
    const mtnH = 0.7 + N4.fbm(x * 3.2, y * 3.2, 4) * 0.7;
    const rr = smoothstep(0.2, 0.8, rk), mm = smoothstep(0.25, 0.85, mt);
    const i = py * w + px;
    height[i] = sandH * (1 - rr) + rockH * rr * (1 - mm) + mtnH * mm;
    rockW[i] = rr; mtnW[i] = mm;
  }
  const L = [-0.6, -0.6, 0.53];
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const i = py * w + px;
    const hx = height[py * w + Math.min(px + 1, w - 1)] - height[py * w + Math.max(px - 1, 0)];
    const hy = height[Math.min(py + 1, h - 1) * w + px] - height[Math.max(py - 1, 0) * w + px];
    const k = 3.2;
    let nx = -hx * k, ny = -hy * k, nz = 1;
    const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const dot = clamp(nx * L[0] + ny * L[1] + nz * L[2], 0, 1);
    const sh = 0.5 + dot * 0.75;
    const x = px / S / HW, y = py / S / HW;
    const v1 = N4.v(x * 2, y * 2);
    const rr = rockW[i], mm = mtnW[i];
    let r = 224 - v1 * 26, g = 170 - v1 * 28, b = 104 - v1 * 24;
    r = r * (1 - rr) + (122 - v1 * 24) * rr; g = g * (1 - rr) + (100 - v1 * 20) * rr; b = b * (1 - rr) + (84 - v1 * 16) * rr;
    r = r * (1 - mm) + (92 - v1 * 18) * mm; g = g * (1 - mm) + (76 - v1 * 14) * mm; b = b * (1 - mm) + (68 - v1 * 10) * mm;
    img.data[i * 4] = clamp(r * sh + 6, 0, 255);
    img.data[i * 4 + 1] = clamp(g * sh, 0, 255);
    img.data[i * 4 + 2] = clamp(b * sh * 0.97, 0, 255);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // Auf volle Auflösung hochskalieren und Details zeichnen
  const full = document.createElement('canvas');
  full.width = Math.ceil(map.size.w); full.height = Math.ceil(map.size.h);
  const fc = full.getContext('2d');
  fc.imageSmoothingEnabled = true; fc.imageSmoothingQuality = 'high';
  fc.drawImage(cv, 0, 0, full.width, full.height);
  // Feine Körnung
  const grain = fc.createImageData(full.width, full.height);
  for (let i = 0; i < grain.data.length; i += 4) {
    const g = Math.random() * 255;
    grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = g; grain.data[i + 3] = 14;
  }
  const gc = document.createElement('canvas'); gc.width = full.width; gc.height = full.height;
  gc.getContext('2d').putImageData(grain, 0, 0);
  fc.globalCompositeOperation = 'overlay'; fc.drawImage(gc, 0, 0); fc.globalCompositeOperation = 'source-over';
  // Felsbrocken und Risse
  const rnd = mulberry(map.seed);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const t = ter[r * W + c], p = center(c, r);
    if (t === 'rock' || t === 'mountain') {
      const n = t === 'rock' ? 7 : 4;
      for (let k = 0; k < n; k++) {
        const a = rnd() * 6.28, d = rnd() * R * 0.8, s = 1.5 + rnd() * (t === 'rock' ? 3 : 5);
        const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
        fc.fillStyle = 'rgba(0,0,0,0.25)'; fc.beginPath(); fc.ellipse(x + 1.5, y + 1.5, s, s * 0.7, 0, 0, 6.28); fc.fill();
        fc.fillStyle = `rgba(${150 + rnd() * 30},${125 + rnd() * 25},${105 + rnd() * 20},0.8)`; fc.beginPath(); fc.ellipse(x, y, s, s * 0.7, a, 0, 6.28); fc.fill();
      }
      if (t === 'rock') {
        fc.strokeStyle = 'rgba(40,30,25,0.25)'; fc.lineWidth = 1;
        fc.beginPath(); let x = p.x + (rnd() - 0.5) * R, y = p.y + (rnd() - 0.5) * R; fc.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 16; y += (rnd() - 0.5) * 16; fc.lineTo(x, y); }
        fc.stroke();
      }
    }
  }
  return full;
}

function mulberry(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
