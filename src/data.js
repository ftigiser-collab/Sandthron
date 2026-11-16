// Datengetriebene Definitionen für den Rundenmodus
// TP = Trefferpunkte (100 = volle Stärke), Reichweite in Hexfeldern

export const FACTIONS = {
  vareth: { name: 'Haus Vareth', color: '#3fa8ff', motto: 'Ordnung aus dem Sand' },
  kordan: { name: 'Haus Kordan', color: '#ff4a3a', motto: 'Stahl über Staub' },
  ossar: { name: 'Ossar-Syndikat', color: '#5fe07a', motto: 'Was verborgen ist, gehört uns' },
};

export const TERRAIN = {
  sand:     { name: 'Offener Sand', def: 0,    sand: true,  build: false },
  dune:     { name: 'Dünen',        def: 0.1,  sand: true,  build: false },
  rock:     { name: 'Fels',         def: 0.15, sand: false, build: true },
  mountain: { name: 'Gebirge',      def: 0.35, sand: false, build: false },
};
export const TER_IDS = ['sand', 'dune', 'rock', 'mountain'];

// Bewegungskosten je Fortbewegungsart (Infinity = unpassierbar)
export const MOVE_COST = {
  foot:  { sand: 1, dune: 2, rock: 1, mountain: 2 },
  wheel: { sand: 1, dune: 3, rock: 1, mountain: Infinity },
  track: { sand: 1, dune: 2, rock: 1, mountain: Infinity },
  air:   { sand: 1, dune: 1, rock: 1, mountain: 1 },
};

export const ARMOR_MOD = {
  rifle:     { inf: 1.0, light: 0.45, heavy: 0.15, bld: 0.12, air: 0 },
  mg:        { inf: 1.1, light: 0.75, heavy: 0.25, bld: 0.15, air: 0 },
  cannon:    { inf: 0.5, light: 0.9, heavy: 0.85, bld: 0.6, air: 0 },
  rocket:    { inf: 0.4, light: 0.95, heavy: 0.95, bld: 0.5, air: 1.0 },
  artillery: { inf: 1.0, light: 0.85, heavy: 0.6, bld: 0.8, air: 0 },
  flak:      { inf: 0.2, light: 0.1, heavy: 0, bld: 0, air: 1.2 },
  tmg:       { inf: 1.05, light: 0.55, heavy: 0.15, bld: 0.1, air: 0.7 },
  trocket:   { inf: 0.55, light: 1.0, heavy: 1.05, bld: 0.75, air: 0 },
  turret:    { inf: 0.8, light: 0.9, heavy: 0.75, bld: 0, air: 0 },
};

export const WEAPONS = {
  rifle:     { type: 'rifle', power: 50, range: [1, 1], ground: true, air: false, proj: 'bullet' },
  mg:        { type: 'mg', power: 52, range: [1, 1], ground: true, air: false, proj: 'bullet' },
  cannon:    { type: 'cannon', power: 72, range: [1, 1], ground: true, air: false, proj: 'shell' },
  rocketInf: { type: 'rocket', power: 62, range: [1, 1], ground: true, air: true, proj: 'rocket' },
  artillery: { type: 'artillery', power: 78, range: [2, 4], ground: true, air: false, proj: 'arty', noMoveFire: true, noCounter: true },
  tmg:       { type: 'tmg', power: 48, range: [1, 1], ground: true, air: true, proj: 'bullet' },
  trocket:   { type: 'trocket', power: 70, range: [1, 1], ground: true, air: false, proj: 'rocket', ammo: true },
  turretGun: { type: 'turret', power: 68, range: [1, 2], ground: true, air: false, proj: 'shell' },
  flak:      { type: 'flak', power: 75, range: [1, 3], ground: false, air: true, proj: 'flak' },
};

export const UNITS = {
  inf:     { name: 'Infanterist', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', weapon: 'rifle', cost: 100, prereq: ['kaserne'], vib: 1,
             desc: 'Günstig und geländegängig — klettert sogar ins Gebirge.' },
  rak:     { name: 'Raketentrupp', cat: 'inf', move: 2, mt: 'foot', sight: 2, armor: 'inf', weapon: 'rocketInf', cost: 250, prereq: ['kaserne'], vib: 1,
             desc: 'Panzerabwehr zu Fuß. Trifft auch Thopter.' },
  trike:   { name: 'Sandläufer', cat: 'veh', move: 7, mt: 'wheel', sight: 3, armor: 'light', weapon: 'mg', cost: 350, prereq: ['fabrik'], vib: 2,
             desc: 'Schnellster Bodenspäher. Hasst Dünen.' },
  panzer:  { name: 'Kampfpanzer', cat: 'veh', move: 4, mt: 'track', sight: 2, armor: 'heavy', weapon: 'cannon', cost: 800, prereq: ['fabrik'], vib: 2,
             desc: 'Rückgrat jeder Armee.' },
  werfer:  { name: 'Raketenwerfer', cat: 'veh', move: 3, mt: 'track', sight: 2, armor: 'light', weapon: 'artillery', cost: 900, prereq: ['fabrik', 'ausguck'], vib: 2,
             desc: 'Reichweite 2–4. Kann nicht ziehen und feuern in derselben Runde.' },
  ernter:  { name: 'Ernter', cat: 'veh', move: 3, mt: 'track', sight: 2, armor: 'heavy', cost: 1000, prereq: ['fabrik', 'raffinerie'], vib: 3, harvester: true, capacity: 525, rate: 175,
             desc: 'Erntet bis zu 175 Glut pro Runde, fasst 525. Lockt Würmer stark an.' },
  libelle: { name: 'Späh-Thopter', cat: 'air', move: 9, mt: 'air', sight: 4, armor: 'air', weapon: 'tmg', cost: 600, prereq: ['horst'],
             desc: 'Weitsicht und Bordkanone. Jagt Infanterie und andere Thopter.' },
  falke:   { name: 'Kampf-Thopter', cat: 'air', move: 7, mt: 'air', sight: 3, armor: 'air', weapon: 'trocket', ammo: 3, cost: 1100, prereq: ['horst', 'ausguck'],
             desc: '3 Raketensalven gegen Panzer und Gebäude. Lädt am Horst nach.' },
  traeger: { name: 'Träger-Thopter', cat: 'air', move: 8, mt: 'air', sight: 2, armor: 'air', cost: 800, prereq: ['horst'], carrier: true,
             desc: 'Hebt eine Bodeneinheit an und setzt sie ab — rettet Ernter vor Würmern.' },
};

export const BUILDINGS = {
  bauhof:     { name: 'Bauhof', hp: 300, power: 10, cost: 3000, turns: 0, sight: 3, buildable: false,
                desc: 'Herz der Basis. Errichtet ein Gebäude pro Runde und bringt 100 Credits Grundeinkommen.' },
  windfalle:  { name: 'Windfalle', cat: 'bld', hp: 150, power: 100, cost: 300, turns: 1, sight: 2, prereq: ['bauhof'],
                desc: 'Gewinnt Energie aus Wind und Luftfeuchte.' },
  raffinerie: { name: 'Raffinerie', cat: 'bld', hp: 220, power: -30, cost: 1400, turns: 2, sight: 2, prereq: ['windfalle'], freeUnit: 'ernter',
                desc: 'Ernter laden hier ab. Mit einem Ernter.' },
  kaserne:    { name: 'Kaserne', cat: 'bld', hp: 180, power: -20, cost: 300, turns: 1, sight: 2, prereq: ['windfalle'], produces: 'inf',
                desc: 'Bildet eine Infanterieeinheit pro Runde aus.' },
  fabrik:     { name: 'Fahrzeugwerk', cat: 'bld', hp: 260, power: -30, cost: 1500, turns: 2, sight: 2, prereq: ['raffinerie'], produces: 'veh',
                desc: 'Baut ein Fahrzeug pro Runde.' },
  ausguck:    { name: 'Ausguck', cat: 'bld', hp: 180, power: -40, cost: 700, turns: 1, sight: 6, prereq: ['raffinerie'], radar: true,
                desc: 'Weite Sicht. Zeigt Wurmzeichen im Umkreis von 9 Feldern.' },
  horst:      { name: 'Thopter-Horst', cat: 'bld', hp: 220, power: -40, cost: 1000, turns: 2, sight: 2, prereq: ['ausguck'], produces: 'air',
                desc: 'Baut Thopter und munitioniert Kampf-Thopter auf.' },
  turm:       { name: 'Geschützturm', cat: 'def', hp: 200, power: -15, cost: 500, turns: 1, sight: 3, prereq: ['kaserne'], weapon: 'turretGun',
                desc: 'Bodenabwehr, Reichweite 2. Feuert automatisch am Rundenende.' },
  flak:       { name: 'Flakstellung', cat: 'def', hp: 160, power: -20, cost: 600, turns: 1, sight: 3, prereq: ['ausguck'], weapon: 'flak',
                desc: 'Luftabwehr, Reichweite 3. Feuert automatisch am Rundenende.' },
};

export const DIFFICULTY = {
  leicht: { name: 'Leicht', aiBonus: 0.8, wave: 4, firstAttack: 9 },
  normal: { name: 'Normal', aiBonus: 1.0, wave: 5, firstAttack: 7 },
  schwer: { name: 'Schwer', aiBonus: 1.3, wave: 6, firstAttack: 5 },
};

export const START_CREDITS = 2500;
