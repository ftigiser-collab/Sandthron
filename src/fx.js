// Partikel und Effekte
const R = Math.random;

export class FX {
  constructor() { this.p = []; this.decals = []; this.corpses = []; this.tracks = []; this.shake = 0; }

  add(o) {
    if (this.p.length > 3000) return;
    o.t = 0; o.z = o.z || 0; o.vx = o.vx || 0; o.vy = o.vy || 0; o.vz = o.vz || 0;
    this.p.push(o);
  }

  dust(x, y, n = 1, col = '196,150,96', spread = 6, size = 5) {
    for (let i = 0; i < n; i++) this.add({ kind: 'puff', x: x + (R() - 0.5) * spread, y: y + (R() - 0.5) * spread, vx: (R() - 0.5) * 14, vy: (R() - 0.5) * 14 - 4, life: 0.9 + R() * 0.8, size: size + R() * 3, grow: 14, col, a: 0.35 });
  }
  smoke(x, y, n = 1, size = 6, dark = 0.5) {
    for (let i = 0; i < n; i++) {
      const c = Math.round(60 + R() * 40 * (1 - dark));
      this.add({ kind: 'puff', x: x + (R() - 0.5) * 6, y: y + (R() - 0.5) * 6, vx: (R() - 0.5) * 10 + 6, vy: -8 - R() * 10, life: 1.4 + R() * 1.4, size: size + R() * 4, grow: 16, col: `${c},${c - 6},${c - 10}`, a: 0.5, air: true });
    }
  }
  fire(x, y, n = 1, size = 5) {
    for (let i = 0; i < n; i++) this.add({ kind: 'glow', x: x + (R() - 0.5) * 8, y: y + (R() - 0.5) * 8, vx: (R() - 0.5) * 20, vy: -10 - R() * 20, life: 0.35 + R() * 0.4, size: size + R() * 4, grow: -4, col: '255,150,50', a: 0.9 });
  }
  spark(x, y, n = 4, col = '255,220,140', speed = 120) {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, s = speed * (0.4 + R());
      this.add({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.2 + R() * 0.3, size: 1.5, col, a: 1 });
    }
  }
  flash(x, y, size = 20, col = '255,200,120', life = 0.12) {
    this.add({ kind: 'glow', x, y, life, size, grow: size * 2, col, a: 1 });
  }
  ring(x, y, size = 10, col = '255,230,190', life = 0.4) {
    this.add({ kind: 'ring', x, y, life, size, grow: size * 6, col, a: 0.7 });
  }
  tracer(x1, y1, x2, y2, col = '255,230,150') {
    this.add({ kind: 'line', x: x1, y: y1, x2, y2, life: 0.07, col, a: 0.9 });
  }
  debris(x, y, n = 6, col = '60,50,40') {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, s = 40 + R() * 90;
      this.add({ kind: 'debris', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 60 + R() * 120, life: 0.8 + R() * 0.6, size: 1.5 + R() * 2.5, col, a: 1 });
    }
  }
  sandBurst(x, y, n = 30, radius = 30) {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, s = 30 + R() * 110;
      this.add({ kind: 'debris', x: x + Math.cos(a) * radius * R(), y: y + Math.sin(a) * radius * R(), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 80 + R() * 200, life: 0.9 + R() * 0.8, size: 2 + R() * 3, col: '214,168,104', a: 1 });
    }
    this.dust(x, y, 18, '206,160,100', radius * 1.6, 12);
  }

  explosion(x, y, size = 1) {
    this.flash(x, y, 26 * size, '255,190,110', 0.18);
    this.ring(x, y, 6 * size, '255,220,170', 0.35);
    this.fire(x, y, Math.round(8 * size), 6 * size);
    this.smoke(x, y, Math.round(5 * size), 8 * size, 0.8);
    this.spark(x, y, Math.round(10 * size), '255,200,120', 160 * size);
    this.debris(x, y, Math.round(5 * size));
    this.decal(x, y, 10 * size + 4);
    this.shake = Math.max(this.shake, 2 * size);
    if (size >= 1.1) {
      // Feuerball und aufsteigende Rauchsäule
      this.add({ kind: 'glow', x, y: y - 6, vy: -18, life: 0.6, size: 22 * size, grow: 18, col: '255,140,50', a: 0.9 });
      for (let k = 0; k < 8 * size; k++) this.add({ kind: 'puff', x: x + (R() - 0.5) * 10, y: y - k * 3, vx: 4 + R() * 6, vy: -18 - R() * 14 - k * 2, life: 2.2 + R() * 1.6, size: 6 + R() * 5, grow: 10, col: `${45 + R() * 25 | 0},${40 + R() * 20 | 0},${36 + R() * 15 | 0}`, a: 0.55, air: true });
    }
  }
  corpse(x, y, a, color, n = 2) {
    for (let k = 0; k < n; k++) this.corpses.push({ x: x + (Math.random() - 0.5) * 16, y: y + (Math.random() - 0.5) * 12, a: a + (Math.random() - 0.5) * 1.5, color, t: 0 });
    if (this.corpses.length > 60) this.corpses.splice(0, this.corpses.length - 60);
  }
  track(x, y, a, w = 7) {
    this.tracks.push({ x, y, a, w, t: 0 });
    if (this.tracks.length > 900) this.tracks.splice(0, 100);
  }
  decal(x, y, r) {
    this.decals.push({ x, y, r, a: 0.55, rot: R() * 6 });
    if (this.decals.length > 160) this.decals.shift();
  }

  update(dt) {
    const p = this.p;
    let w = 0;
    for (let i = 0; i < p.length; i++) {
      const o = p[i];
      o.t += dt;
      if (o.t >= o.life) continue;
      o.x += o.vx * dt; o.y += o.vy * dt;
      if (o.kind === 'debris') {
        o.vz -= 380 * dt; o.z += o.vz * dt;
        if (o.z < 0) { o.z = 0; o.vz *= -0.3; o.vx *= 0.6; o.vy *= 0.6; }
      } else { o.vx *= 1 - dt * 1.5; o.vy *= 1 - dt * 1.5; }
      if (o.grow) o.size = Math.max(0.5, o.size + o.grow * dt);
      p[w++] = o;
    }
    p.length = w;
    for (const d of this.decals) d.a = Math.max(0.15, d.a - dt * 0.004);
    for (const c of this.corpses) c.t += dt;
    for (const k of this.tracks) k.t += dt;
    if (this.tracks.length && this.tracks[0].t > 45) this.tracks = this.tracks.filter((k) => k.t < 45);
    if (this.corpses.length && this.corpses[0].t > 25) this.corpses = this.corpses.filter((c) => c.t < 25);
    this.shake = Math.max(0, this.shake - dt * 12);
  }

  drawDecals(ctx) {
    ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (const k of this.tracks) {
      const a = (1 - k.t / 45) * 0.22, ca = Math.cos(k.a), sa = Math.sin(k.a), px = -sa * k.w, py = ca * k.w;
      ctx.strokeStyle = `rgba(90,60,35,${a})`;
      ctx.beginPath();
      ctx.moveTo(k.x + px - ca * 3, k.y + py - sa * 3); ctx.lineTo(k.x + px + ca * 3, k.y + py + sa * 3);
      ctx.moveTo(k.x - px - ca * 3, k.y - py - sa * 3); ctx.lineTo(k.x - px + ca * 3, k.y - py + sa * 3);
      ctx.stroke();
    }
    for (const c of this.corpses) {
      const a = Math.min(1, (25 - c.t) / 5) * 0.85;
      ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(1, 1.5, 8, 4, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#5e5242'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 2.6, 0, 0, 6.28); ctx.fill();
      ctx.fillStyle = '#7a6a55'; ctx.beginPath(); ctx.arc(6.5, 0, 2.2, 0, 6.28); ctx.fill();
      ctx.fillStyle = c.color; ctx.fillRect(-2, -2.6, 2.5, 2);
      ctx.strokeStyle = '#22252a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, 4); ctx.lineTo(5, 6); ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const d of this.decals) {
      const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
      g.addColorStop(0, `rgba(30,20,14,${d.a})`);
      g.addColorStop(0.6, `rgba(40,28,18,${d.a * 0.5})`);
      g.addColorStop(1, 'rgba(40,28,18,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill();
    }
  }

  // layer: 'ground' (Staub), 'air' (Rauch/Trümmer), 'add' (Leuchten)
  draw(ctx, layer, view) {
    const add = layer === 'add';
    if (add) ctx.globalCompositeOperation = 'lighter';
    for (const o of this.p) {
      if (o.x < view.x0 || o.x > view.x1 || o.y < view.y0 || o.y > view.y1) continue;
      const k = 1 - o.t / o.life;
      if (add) {
        if (o.kind === 'glow') {
          const r = o.size;
          const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
          g.addColorStop(0, `rgba(${o.col},${o.a * k})`);
          g.addColorStop(1, `rgba(${o.col},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 6.283); ctx.fill();
        } else if (o.kind === 'spark') {
          ctx.strokeStyle = `rgba(${o.col},${k})`; ctx.lineWidth = o.size;
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x - o.vx * 0.03, o.y - o.vy * 0.03); ctx.stroke();
        } else if (o.kind === 'line') {
          ctx.strokeStyle = `rgba(${o.col},${o.a * k})`; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x2, o.y2); ctx.stroke();
        } else if (o.kind === 'ring') {
          ctx.strokeStyle = `rgba(${o.col},${o.a * k})`; ctx.lineWidth = 2.5 * k + 0.5;
          ctx.beginPath(); ctx.arc(o.x, o.y, o.size, 0, 6.283); ctx.stroke();
        }
      } else if (o.kind === 'puff' && (!!o.air === (layer === 'air'))) {
        ctx.fillStyle = `rgba(${o.col},${o.a * k})`;
        ctx.beginPath(); ctx.arc(o.x, o.y, o.size, 0, 6.283); ctx.fill();
      } else if (o.kind === 'debris' && layer === 'air') {
        ctx.fillStyle = `rgba(0,0,0,${0.25 * k})`;
        ctx.fillRect(o.x - o.size / 2 + 2, o.y - o.size / 2 + 2, o.size, o.size);
        ctx.fillStyle = `rgba(${o.col},${k})`;
        ctx.fillRect(o.x - o.size / 2, o.y - o.z * 0.5 - o.size / 2, o.size, o.size);
      }
    }
    if (add) ctx.globalCompositeOperation = 'source-over';
  }
}
