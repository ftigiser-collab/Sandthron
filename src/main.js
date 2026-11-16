// Einstieg: Menü, Initialisierung, Spielschleife
import { generateMap } from './map.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { Controller } from './ui.js';
import { FX } from './fx.js';
import { DIFFICULTY } from './data.js';
import { center } from './hex.js';

const $ = (s) => document.querySelector(s);
let diff = 'normal';

document.querySelectorAll('#menu [data-diff]').forEach((b) => {
  b.onclick = () => { diff = b.dataset.diff; document.querySelectorAll('#menu [data-diff]').forEach((x) => x.classList.toggle('on', x === b)); };
});
$('#start').onclick = () => start();

async function start() {
  $('#menu .loading').classList.add('show');
  $('#start').disabled = true;
  await new Promise((r) => setTimeout(r, 50));
  const seedIn = $('#seed').value.trim();
  const seed = seedIn ? (parseInt(seedIn, 10) || hash(seedIn)) : Math.floor(Math.random() * 1e6);
  const map = generateMap(seed);
  const game = new Game(map, { diff: DIFFICULTY[diff] });
  game.setup();
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
  game.say('Willkommen auf Sandthron. Baut eure Basis aus und erntet Glut.', 'info');
  game.say('Tipp: Bauhof antippen, um Gebäude zu errichten.', 'info');
  await ctrl.banner('Runde 1', 'Euer Zug', 1.2);
}

function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) % 1e6; }

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
