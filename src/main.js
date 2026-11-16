// Einstieg: Menü, Initialisierung, Spielschleife
import { generateMap } from './map.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { Controller } from './ui.js';
import { FX } from './fx.js';
import { DIFFICULTY } from './data.js';
import { center } from './hex.js';

const $ = (s) => document.querySelector(s);
let diff = 'normal', faction = 'vareth';
document.querySelectorAll('#menu [data-fac]').forEach((b) => {
  b.onclick = () => { faction = b.dataset.fac; document.querySelectorAll('#menu [data-fac]').forEach((x) => x.classList.toggle('on', x === b)); };
});
let saved = null;
try { saved = JSON.parse(localStorage.getItem('sandthron-save') || 'null'); } catch (e) { saved = null; }
if (saved && saved.v === 2) { const c = $('#continue'); c.style.display = 'block'; c.textContent = `Fortsetzen (Runde ${saved.round})`; c.onclick = () => start(saved); }

document.querySelectorAll('#menu [data-diff]').forEach((b) => {
  b.onclick = () => { diff = b.dataset.diff; document.querySelectorAll('#menu [data-diff]').forEach((x) => x.classList.toggle('on', x === b)); };
});
$('#start').onclick = () => start();

async function start(save) {
  $('#menu .loading').classList.add('show');
  $('#start').disabled = true;
  await new Promise((r) => setTimeout(r, 50));
  let seed, map, game;
  if (save) {
    seed = save.seed; map = generateMap(seed);
    game = Game.restore(map, save, DIFFICULTY[save.diffName || 'normal']);
  } else {
    const seedIn = $('#seed').value.trim();
    seed = seedIn ? (parseInt(seedIn, 10) || hash(seedIn)) : Math.floor(Math.random() * 1e6);
    map = generateMap(seed);
    const foes = ['vareth', 'kordan', 'ossar'].filter((f) => f !== faction);
    game = new Game(map, { diff: DIFFICULTY[diff], playerFaction: faction, enemyFaction: foes[Math.floor(Math.random() * foes.length)] });
    game.diffName = diff;
    game.setup();
  }
  const fx = new FX();
  const renderer = new Renderer($('#game'), game, fx);
  const ctrl = new Controller(game, renderer, fx);
  window.__game = { game, renderer, ctrl };
  const home = center(map.starts[0].c, map.starts[0].r);
  renderer.cam.z = window.innerWidth < 700 ? 0.8 : 1.05;
  renderer.centerOn(home.x + 60, home.y + 40, false);
  $('#menu').classList.add('hide');
  $('#seedinfo').textContent = `Karte ${seed}`;
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctrl.update(dt);
    renderer.draw(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  if (!save) {
    game.say('Willkommen auf Sandthron. Baut eure Basis aus und erntet Glut.', 'info');
    game.say('Tipp: Bauhof antippen, um Gebäude zu errichten.', 'info');
  }
  if (!save) ctrl.save();
  ctrl.refresh();
  await ctrl.banner(`Runde ${game.round}`, save ? 'Spiel fortgesetzt' : `${game.players[0].name} gegen ${game.players[1].name}`, 1.4);
}

function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) % 1e6; }

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
