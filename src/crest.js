// Fraktionswappen: Wappenschild mit eigenem Zeichen, auf Canvas gezeichnet
const STYLE = {
  vareth:   { field: ['#2c6fb0', '#0f2d4d'], metal: ['#e8eef4', '#9fb0c0'], rim: '#cfd8e2' },
  kordan:   { field: ['#a8281e', '#3e0b07'], metal: ['#e8c47a', '#9a7232'], rim: '#d9b064' },
  ossar:    { field: ['#2f8a4a', '#0b2614'], metal: ['#dfe6d0', '#8f9a80'], rim: '#bfcab0' },
  sandvolk: { field: ['#c8902e', '#5a3a10'], metal: ['#fff0c8', '#c9a464'], rim: '#f0d79a' },
};

function shield(c) {
  c.beginPath();
  c.moveTo(-40, -46); c.lineTo(40, -46); c.lineTo(40, -6);
  c.bezierCurveTo(40, 22, 20, 40, 0, 50); c.bezierCurveTo(-20, 40, -40, 22, -40, -6);
  c.closePath();
}

const EMBLEM = {
  // Gekreuzte Flügelblätter um eine Raute (Lufthaus)
  vareth(c, m) {
    for (const s of [-1, 1]) for (const a of [-0.55, 0.55]) {
      c.save(); c.rotate(a * s + (s < 0 ? Math.PI : 0));
      c.fillStyle = m; c.beginPath(); c.moveTo(4, -3); c.lineTo(34, -6); c.lineTo(37, -1); c.lineTo(34, 3); c.lineTo(4, 3); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(12, -4); c.lineTo(12, 3); c.moveTo(22, -5); c.lineTo(22, 3); c.stroke();
      c.restore();
    }
    c.fillStyle = m; c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 0); c.lineTo(0, 11); c.lineTo(-8, 0); c.closePath(); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.moveTo(0, -5); c.lineTo(4, 0); c.lineTo(0, 5); c.lineTo(-4, 0); c.closePath(); c.fill();
  },
  // Zahnrad mit Schmiedehammer (Panzerhaus)
  kordan(c, m) {
    c.fillStyle = m;
    for (let i = 0; i < 10; i++) { c.save(); c.rotate(i / 10 * 6.283); c.fillRect(-4, -28, 8, 9); c.restore(); }
    c.beginPath(); c.arc(0, 0, 22, 0, 6.283); c.arc(0, 0, 13, 6.283, 0, true); c.fill();
    c.fillRect(-3, -16, 6, 34);
    c.beginPath(); c.moveTo(-14, -20); c.lineTo(14, -20); c.lineTo(12, -11); c.lineTo(-12, -11); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, 17.5, 0, 6.283); c.stroke();
  },
  // Orbitring mit Stern über drei Winkeln (Syndikat)
  ossar(c, m) {
    c.strokeStyle = m; c.lineWidth = 3.4;
    c.beginPath(); c.ellipse(0, -14, 22, 8, -0.25, 0, 6.283); c.stroke();
    c.fillStyle = m; c.beginPath();
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 - 1.571, r = i % 2 ? 4 : 10; c.lineTo(Math.cos(a) * r, -14 + Math.sin(a) * r); }
    c.closePath(); c.fill();
    for (let k = 0; k < 3; k++) {
      const y = 4 + k * 10;
      c.beginPath(); c.moveTo(-22, y); c.lineTo(0, y + 9); c.lineTo(22, y); c.lineTo(22, y + 5); c.lineTo(0, y + 14); c.lineTo(-22, y + 5); c.closePath(); c.fill();
    }
  },
  // Spiralsonne über drei Dünenwellen (Wüstenvolk)
  sandvolk(c, m) {
    c.strokeStyle = m; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath();
    for (let a = 0; a < 6.283 * 2.2; a += 0.1) { const r = 2 + a * 1.25; const x = Math.cos(a) * r, y = -14 + Math.sin(a) * r; a === 0 ? c.moveTo(x, y) : c.lineTo(x, y); }
    c.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; c.beginPath(); c.moveTo(Math.cos(a) * 21, -14 + Math.sin(a) * 21); c.lineTo(Math.cos(a) * 26, -14 + Math.sin(a) * 26); c.stroke(); }
    c.lineWidth = 3.4;
    for (let k = 0; k < 3; k++) {
      const y = 14 + k * 8;
      c.beginPath(); c.moveTo(-28 + k * 3, y); c.quadraticCurveTo(-12, y - 8, 0, y); c.quadraticCurveTo(12, y + 6, 28 - k * 3, y - 2); c.stroke();
    }
  },
};

export function drawCrest(ctx, faction, size) {
  const st = STYLE[faction] || STYLE.vareth, k = size / 110;
  ctx.save(); ctx.scale(k, k); ctx.translate(55, 56);
  // Schatten
  ctx.save(); ctx.translate(2.5, 3.5); shield(ctx); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); ctx.restore();
  // Feld
  shield(ctx);
  const g = ctx.createLinearGradient(-40, -46, 40, 50); g.addColorStop(0, st.field[0]); g.addColorStop(1, st.field[1]);
  ctx.fillStyle = g; ctx.fill();
  // Teilung und Glanz
  ctx.save(); shield(ctx); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(-40, -46, 40, 100);
  const sh = ctx.createRadialGradient(-14, -24, 2, 0, 0, 70); sh.addColorStop(0, 'rgba(255,255,255,0.22)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(-40, -46, 80, 100);
  // Zeichen in Metall mit Prägung
  const mg = ctx.createLinearGradient(-30, -30, 30, 30); mg.addColorStop(0, st.metal[0]); mg.addColorStop(1, st.metal[1]);
  ctx.save(); ctx.translate(1, 1.4); EMBLEM[faction]?.(ctx, 'rgba(0,0,0,0.45)'); ctx.restore();
  EMBLEM[faction]?.(ctx, mg);
  ctx.restore();
  // Rand
  shield(ctx); ctx.lineWidth = 4.5; ctx.strokeStyle = st.rim; ctx.stroke();
  shield(ctx); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
  ctx.restore();
}

const URLS = new Map();
export function crestURL(faction, size = 96) {
  const key = faction + size;
  if (URLS.has(key)) return URLS.get(key);
  const cv = document.createElement('canvas'); cv.width = cv.height = size * 2;
  drawCrest(cv.getContext('2d'), faction, size * 2);
  const u = cv.toDataURL('image/png'); URLS.set(key, u);
  return u;
}
export function crestImg(faction, size = 28, cls = 'crest') { return `<img class="${cls}" src="${crestURL(faction, size)}" width="${size}" height="${size}" alt="">`; }
