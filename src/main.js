// Einstieg: Menü, Initialisierung, Spielschleife
import { generateMap } from './map.js';
import { Game } from './game.js';
import { Renderer } from './render.js';
import { Controller } from './ui.js';
import { FX } from './fx.js';
import { DIFFICULTY } from './data.js';
import { center } from './hex.js';
import { MISSIONS, campaignProgress, setProgress, missionById } from './campaign.js';
import { startMenuBg } from './menubg.js';
import { crestImg } from './crest.js';
import { SLOTS, readAuto, slotMeta, readSlot, deleteSlot, metaFromSave } from './saves.js';
import { FACTIONS } from './data.js';
let menuBg = null;
try { menuBg = startMenuBg(document.getElementById('menu')); } catch (e) { console.warn(e); }

const $ = (s) => document.querySelector(s);
const FAC = ['vareth', 'kordan', 'ossar', 'sandvolk'];
const FAC_TXT = {
  vareth: 'Thopter 15 % günstiger, +1 Bewegung · Sturmadler',
  kordan: 'Fahrzeuge +12 % Schaden, Gebäude +20 % stabiler · Brenner',
  ossar: 'Infanterie +1 Bewegung, Drops 30 % günstiger · Schattenklinge',
  sandvolk: 'Sandvolk-Einheiten 30 % günstiger, +1 Bewegung · Wurmreiter',
};
const MAPS = { klein: [24, 18], mittel: [30, 22], gross: [38, 28] };
const WORMS = { wenige: 1, normal: 2, viele: 4 };
const CREDITS = { knapp: 1500, normal: 2500, reich: 5000 };
// Gefechtseinstellungen (zuletzt gewählte bleiben erhalten)
let opts = { faction: 'vareth', foes: 1, map: 'mittel', worms: 'normal', credits: 'normal', diff: 'normal', seed: '' };
try { opts = { ...opts, ...JSON.parse(localStorage.getItem('sandthron-opts') || '{}') }; } catch {}
$('#mcrests').innerHTML = FAC.map((f) => crestImg(f, 46)).join('');

let saved = readAuto();
if (saved) { const c = $('#continue'); c.style.display = 'block'; c.textContent = `Fortsetzen (Runde ${saved.round})`; c.onclick = () => start(saved); }

function seg(id, values, labels) {
  return `<div class="seg" data-opt="${id}">${values.map((v, i) => `<button data-v="${v}" class="${String(opts[id]) === String(v) ? 'on' : ''}">${labels[i]}</button>`).join('')}</div>`;
}
function showSkirmish() {
  const el = $('#skirmish');
  el.innerHTML = `<div class="box"><button class="close">×</button><h2>Freies Gefecht</h2>
    <div class="m-label">Euer Haus</div>
    <div class="facgrid">${FAC.map((f) => `<button data-fac="${f}" class="${opts.faction === f ? 'on' : ''}" style="--c:${FACTIONS[f].color}">${crestImg(f, 40)}<b>${FACTIONS[f].name}</b><span>${FAC_TXT[f]}</span></button>`).join('')}</div>
    <div class="m-label">Gegner (jeder gegen jeden)</div>${seg('foes', [1, 2, 3], ['1 Gegner', '2 Gegner', '3 Gegner'])}
    <div class="m-label">Kartengröße</div>${seg('map', ['klein', 'mittel', 'gross'], ['Klein', 'Mittel', 'Groß'])}
    <div class="m-label">Würmer</div>${seg('worms', ['wenige', 'normal', 'viele'], ['Wenige', 'Normal', 'Viele'])}
    <div class="m-label">Startkapital</div>${seg('credits', ['knapp', 'normal', 'reich'], ['1500', '2500', '5000'])}
    <div class="m-label">Schwierigkeit</div>${seg('diff', ['leicht', 'normal', 'schwer'], ['Leicht', 'Normal', 'Schwer'])}
    <div class="m-label">Karte (optional)</div><input id="seed" placeholder="Zufällig — oder Zahl/Wort eingeben" autocomplete="off" value="${opts.seed || ''}">
    <div class="row"><button id="sback">Zurück</button><button id="sgo" class="primary">Gefecht starten</button></div></div>`;
  el.classList.add('show');
  el.querySelector('.close').onclick = el.querySelector('#sback').onclick = () => el.classList.remove('show');
  el.querySelectorAll('[data-fac]').forEach((b) => b.onclick = () => { opts.faction = b.dataset.fac; el.querySelectorAll('[data-fac]').forEach((x) => x.classList.toggle('on', x === b)); });
  el.querySelectorAll('.seg').forEach((sg) => sg.querySelectorAll('button').forEach((b) => b.onclick = () => {
    const v = b.dataset.v; opts[sg.dataset.opt] = isNaN(+v) ? v : +v;
    sg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  }));
  el.querySelector('#sgo').onclick = () => {
    opts.seed = el.querySelector('#seed').value.trim();
    try { localStorage.setItem('sandthron-opts', JSON.stringify(opts)); } catch {}
    el.classList.remove('show'); start();
  };
}
function crests(m) { return m.factions.map((f, i) => `<span style="opacity:${m.out && m.out[i] ? 0.3 : 1}">${crestImg(f, 22)}</span>`).join(''); }
function showSaves() {
  const el = $('#saves');
  const auto = readAuto(), am = metaFromSave(auto);
  let html = `<div class="box"><button class="close">×</button><h2>Spielstände</h2>`;
  if (am) html += `<div class="slot"><span class="sn">Auto</span><div><div class="crs">${crests(am)}</div><div class="si">Runde ${am.round} · Karte ${am.size} · ◈ ${am.credits}</div></div><div class="sb"><button class="primary" data-load="auto">Laden</button></div></div>`;
  for (let k = 1; k <= SLOTS; k++) {
    const m = slotMeta(k);
    html += m ? `<div class="slot"><span class="sn">${k}</span><div><div class="crs">${crests(m)}</div><div class="si">${m.mission ? m.mission + ' · ' : ''}Runde ${m.round} · Karte ${m.size} · ${m.date}</div></div><div class="sb"><button class="primary" data-load="${k}">Laden</button><button data-del="${k}">✕</button></div></div>`
      : `<div class="slot"><span class="sn">${k}</span><div class="si">Leer — im Spiel über ☰ speichern</div><div></div></div>`;
  }
  el.innerHTML = html + '</div>';
  el.classList.add('show');
  el.querySelector('.close').onclick = () => el.classList.remove('show');
  el.querySelectorAll('[data-load]').forEach((b) => b.onclick = () => { const k = b.dataset.load; const d = k === 'auto' ? auto : readSlot(+k); if (d) { el.classList.remove('show'); start(d); } });
  el.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { deleteSlot(+b.dataset.del); showSaves(); });
}
$('#start').onclick = () => showSkirmish();
$('#loadbtn').onclick = () => showSaves();
// Laden aus dem laufenden Spiel heraus (Seite wird neu geladen)
try { const ls = sessionStorage.getItem('sandthron-load-slot'); if (ls) { sessionStorage.removeItem('sandthron-load-slot'); const d = ls === 'auto' ? readAuto() : readSlot(+ls); if (d) setTimeout(() => start(d), 50); } } catch {}
$('#campaignbtn').onclick = () => showCampaign();
function showCampaign() {
  const prog = campaignProgress();
  const el = $('#campaign');
  el.innerHTML = `<div class="box"><button class="close">×</button><h2>Kampagne: Der Sand von Askar</h2><div class="sub">Haus Vareth gegen Haus Kordan · ${prog} von ${MISSIONS.length} Missionen erfüllt</div>
    <div class="mlist">${MISSIONS.map((m, i) => `<button class="mcard ${i > prog ? 'locked' : ''} ${i < prog ? 'done' : ''}" data-i="${i}" ${i > prog ? 'disabled' : ''}>
      <span class="mnum">${i + 1}</span><b>${m.title}</b><span>${m.place}</span><em>${i < prog ? 'Erfüllt' : i === prog ? 'Bereit' : 'Gesperrt'}</em></button>`).join('')}</div></div>`;
  el.classList.add('show');
  el.querySelector('.close').onclick = () => el.classList.remove('show');
  el.querySelectorAll('.mcard').forEach((b) => b.onclick = () => showBriefing(MISSIONS[Number(b.dataset.i)]));
}
function showBriefing(m) {
  const el = $('#campaign');
  el.innerHTML = `<div class="box brief"><button class="close">×</button><div class="place">${m.place}</div><h2>${m.title}</h2>
    <div class="speaker">${m.speaker}</div>${m.briefing.map((p) => `<p>${p}</p>`).join('')}
    <div class="m-label">Ziele</div><ul>${m.objectives.map((o) => `<li>${o}</li>`).join('')}</ul>
    <div class="row"><button id="bback">Zurück</button><button id="bgo" class="primary">Mission starten</button></div></div>`;
  el.querySelector('.close').onclick = () => el.classList.remove('show');
  el.querySelector('#bback').onclick = () => showCampaign();
  el.querySelector('#bgo').onclick = () => { el.classList.remove('show'); start(null, m); };
}
try { if (sessionStorage.getItem('sandthron-open-campaign')) { sessionStorage.removeItem('sandthron-open-campaign'); showCampaign(); } } catch {}

async function start(save, mission) {
  $('#menu .loading').classList.add('show');
  await new Promise((r) => setTimeout(r, 50));
  let seed, map, game;
  if (save) {
    seed = save.seed; map = generateMap(seed, save.W || 30, save.H || 22, save.nPlayers || save.players.length);
    game = Game.restore(map, save, DIFFICULTY[save.diffName || 'normal']);
    if (save.missionId) game.mission = missionById(save.missionId);
  } else if (mission) {
    seed = mission.seed; map = generateMap(seed);
    game = new Game(map, { diff: DIFFICULTY[mission.diff], playerFaction: 'vareth', enemyFaction: 'kordan' });
    game.diffName = mission.diff;
    game.setup();
    mission.setup(game);
    game.mission = mission;
    game.updateVision();
  } else {
    seed = opts.seed ? (parseInt(opts.seed, 10) || hash(opts.seed)) : Math.floor(Math.random() * 1e6);
    const [W, H] = MAPS[opts.map] || MAPS.mittel, n = 1 + (opts.foes || 1);
    map = generateMap(seed, W, H, n);
    // Gegner: die anderen Häuser, zufällig gemischt
    const pool = FAC.filter((f) => f !== opts.faction).sort(() => Math.random() - 0.5);
    const factions = [opts.faction, ...pool.slice(0, n - 1)];
    game = new Game(map, { diff: DIFFICULTY[opts.diff], factions, worms: WORMS[opts.worms] ?? 2, startCredits: CREDITS[opts.credits] });
    game.diffName = opts.diff; game.settings = { ...opts };
    game.setup();
  }
  const fx = new FX();
  const renderer = new Renderer($('#game'), game, fx);
  const ctrl = new Controller(game, renderer, fx);
  ctrl.onMissionWon = (m) => { const i = MISSIONS.indexOf(m); setProgress(i + 1); };
  window.__game = { game, renderer, ctrl };
  const home = center(map.starts[0].c, map.starts[0].r);
  renderer.cam.z = window.innerWidth < 700 ? 0.8 : 1.05;
  renderer.centerOn(home.x + 60, home.y + 40, false);
  $('#menu').classList.add('hide');
  if (menuBg) { const b = menuBg; menuBg = null; setTimeout(() => b.stop(), 600); }
  $('#seedinfo').textContent = `Karte ${seed}`;
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
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
  if (game.mission && !save) for (const p of game.mission.briefing.slice(-1)) game.say(p, 'info');
  await ctrl.banner(game.mission ? game.mission.title : `Runde ${game.round}`, save ? 'Spiel fortgesetzt' : game.mission ? game.mission.place : game.players.map((p) => p.name).join(' · '), 1.6);
}

function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) % 1e6; }

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
