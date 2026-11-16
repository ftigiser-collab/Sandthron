// Datengetriebene Definitionen für den Rundenmodus
// TP = Trefferpunkte (100 = volle Stärke), Reichweite in Hexfeldern

export const FACTIONS = {
  vareth: { name: 'Haus Vareth', color: '#3fa8ff', motto: 'Ordnung aus dem Sand', perk: { airCost: 0.85, airMove: 1 }, perkText: 'Thopter 15 % günstiger und +1 Bewegung' },
  kordan: { name: 'Haus Kordan', color: '#ff4a3a', motto: 'Stahl über Staub', perk: { vehPower: 1.12, bldHp: 1.2 }, perkText: 'Fahrzeuge +12 % Schaden, Gebäude +20 % stabiler' },
  ossar: { name: 'Ossar-Syndikat', color: '#5fe07a', motto: 'Was verborgen ist, gehört uns', perk: { infMove: 1, dropCost: 0.7 }, perkText: 'Infanterie +1 Bewegung, Orbital-Drops 30 % günstiger' },
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
  bomb:      { inf: 0.8, light: 1.0, heavy: 1.0, bld: 1.3, air: 0 },
  aam:       { inf: 0, light: 0, heavy: 0, bld: 0, air: 1.15 },
  blade:     { inf: 1.25, light: 0.3, heavy: 0.1, bld: 0.1, air: 0 },
  gauss:     { inf: 1.1, light: 0.8, heavy: 0.45, bld: 0.3, air: 0.3 },
};

export const WEAPONS = {
  rifle:     { type: 'rifle', power: 50, range: [1, 1], ground: true, air: false, proj: 'bullet' },
  mg:        { type: 'mg', power: 52, range: [1, 1], ground: true, air: false, proj: 'bullet' },
  cannon:    { type: 'cannon', power: 72, range: [1, 1], ground: true, air: false, proj: 'shell' },
  rocketInf: { type: 'rocket', power: 62, range: [1, 1], ground: true, air: true, proj: 'rocket' },
  artillery: { type: 'artillery', power: 78, range: [2, 4], ground: true, air: false, proj: 'arty', noMoveFire: true, noCounter: true },
  tmg:       { type: 'tmg', power: 48, range: [1, 1], ground: true, air: true, proj: 'bullet' },
  trocket:   { type: 'trocket', power: 70, range: [1, 1], ground: true, air: false, proj: 'rocket', ammo: true },
  bombs:     { type: 'bomb', power: 95, range: [0, 1], ground: true, air: false, proj: 'bomb', ammo: true },
  aam:       { type: 'aam', power: 82, range: [1, 2], ground: false, air: true, proj: 'rocket' },
  blade:     { type: 'blade', power: 45, range: [1, 1], ground: true, air: false, proj: 'blade' },
  gauss:     { type: 'gauss', power: 62, range: [1, 1], ground: true, air: true, proj: 'bullet' },
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
  ernter:  { name: 'Ernter', cat: 'veh', move: 3, mt: 'track', sight: 2, armor: 'heavy', cost: 1000, prereq: ['fabrik', 'raffinerie'], vib: 4, harvester: true, capacity: 525, rate: 175,
             desc: 'Erntet bis zu 175 Glut pro Runde, fasst 525. Lockt Würmer stark an.' },
  libelle: { name: 'Späh-Thopter', cat: 'air', move: 9, mt: 'air', sight: 4, armor: 'air', weapon: 'tmg', cost: 600, prereq: ['horst', 'ausguck'],
             desc: 'Weitsicht und Bordkanone. Jagt Infanterie und andere Thopter.' },
  falke:   { name: 'Kampf-Thopter', cat: 'air', move: 7, mt: 'air', sight: 3, armor: 'air', weapon: 'trocket', ammo: 3, cost: 1100, prereq: ['horst', 'ausguck'],
             desc: '3 Raketensalven gegen Panzer und Gebäude. Lädt am Horst nach.' },
  bomber:  { name: 'Bomber-Thopter', cat: 'air', move: 6, mt: 'air', sight: 2, armor: 'air', weapon: 'bombs', ammo: 2, cost: 1300, prereq: ['horst', 'ausguck'],
             desc: 'Wirft Bomben auf das Feld unter sich oder daneben. Stark gegen Gebäude. 2 Abwürfe, lädt am Horst nach.' },
  jaeger:  { name: 'Abfang-Thopter', cat: 'air', move: 9, mt: 'air', sight: 3, armor: 'air', weapon: 'aam', cost: 850, prereq: ['horst', 'ausguck'],
             desc: 'Luft-Luft-Raketen mit Reichweite 2. Holt feindliche Thopter vom Himmel, kann keine Bodenziele treffen.' },
  schwester: { name: 'Verhüllte Schwester', cat: 'sis', move: 3, mt: 'foot', sight: 3, armor: 'inf', weapon: 'blade', cost: 500, prereq: ['konvent'], vib: 0.5, voice: true,
             desc: 'Kann mit der Stimme eine feindliche Einheit in 2 Feldern Umkreis für eine Runde lähmen (alle 3 Runden). Im Nahkampf tödlich gegen Infanterie.' },
  soeldner: { name: 'Gilden-Söldner', cat: 'drop', move: 3, mt: 'foot', sight: 2, armor: 'inf', weapon: 'gauss', cost: 0, vib: 1,
             desc: 'Elite-Infanterie der Gilde, nur per Orbital-Drop. Gaußgewehr trifft auch Thopter.' },
  traeger: { name: 'Träger-Thopter', cat: 'air', move: 8, mt: 'air', sight: 2, armor: 'air', cost: 650, prereq: ['horst'], carrier: true,
             desc: 'Lufttransport für Bodeneinheiten. Im Auto-Modus holt er Ernter von weit entfernten Feldern, bringt sie zur Raffinerie und rettet sie vor Würmern.' },
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
  horst:      { name: 'Thopter-Horst', cat: 'bld', hp: 220, power: -40, cost: 1000, turns: 2, sight: 2, prereq: ['raffinerie'], produces: 'air',
                desc: 'Baut Thopter und munitioniert Kampf-Thopter auf.' },
  kontor:     { name: 'Gildenkontor', cat: 'bld', hp: 220, power: -40, cost: 1200, turns: 2, sight: 2, prereq: ['ausguck'],
                desc: 'Draht zur Gilde der Leere: Orbital-Drops auf jedes bekannte Feld. Ein Drop alle 2 Runden.' },
  konvent:    { name: 'Konvent', cat: 'bld', hp: 180, power: -30, cost: 1000, turns: 2, sight: 3, prereq: ['kaserne', 'raffinerie'], produces: 'sis',
                desc: 'Sitz der Verhüllten Schwesternschaft: alle 3 Runden eine Intrigenkarte, bildet Schwestern aus.' },
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

export const DROPS = {
  trupp:  { name: 'Söldnertrupp', units: ['inf', 'inf', 'rak'], cost: 650, desc: '2 Infanteristen und ein Raketentrupp.' },
  elite:  { name: 'Gilden-Söldner', units: ['soeldner', 'soeldner'], cost: 1100, desc: 'Zwei Trupps Elite-Infanterie mit Gaußgewehren.' },
  panzer: { name: 'Panzerlieferung', units: ['panzer'], cost: 1250, desc: 'Ein Kampfpanzer, direkt an die Front.' },
  ernter: { name: 'Ernter-Lieferung', units: ['ernter'], cost: 1300, desc: 'Ein Ernter, abgesetzt direkt an einem Glutfeld.' },
};

export const CARDS = {
  stimme:    { name: 'Stimme', target: 'enemyUnit', weight: 3, desc: 'Eine sichtbare feindliche Einheit kann in ihrer nächsten Runde nicht handeln.' },
  vorahnung: { name: 'Vorahnung', target: 'none', weight: 2, desc: 'Deckt für den Rest dieser Runde die ganze Karte auf.' },
  wetter:    { name: 'Wetterkunde', target: 'stormHex', weight: 2, desc: 'Lenkt den Sturm: Wählt sein nächstes Ziel, bis zu 4 Felder vom vorhergesagten entfernt.' },
  klopfer:   { name: 'Klopfer', target: 'sandHex', weight: 3, desc: 'Ein Köder im Sand. In der Weltphase kommen alle Würmer im Umkreis von 12 Feldern dorthin und verschlingen, was im Umkreis von 1 Feld steht.' },
  verrat:    { name: 'Verrat', target: 'enemyInf', weight: 2, desc: 'Eine sichtbare feindliche Infanterie-Einheit läuft zu euch über.' },
  schild:    { name: 'Schildwall', target: 'own', weight: 3, desc: 'Eine eigene Einheit oder ein Gebäude erleidet 2 Runden lang nur halben Schaden.' },
  sabotage:  { name: 'Sabotage', target: 'enemyBld', weight: 2, desc: 'Ein bekanntes feindliches Gebäude fällt eine Runde lang aus: keine Produktion, kein Strom, keine Abwehr.' },
  gilde:     { name: 'Gildenschuld', target: 'none', weight: 1, desc: 'Der nächste Orbital-Drop kostet nichts.' },
};
