// Partikel und Effekte
const R = Math.random;

export class FX {
  constructor() { this.p = []; this.decals = []; this.shake = 0; }

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
    this.shake = Math.max(0, this.shake - dt * 12);
  }

  drawDecals(ctx) {
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
