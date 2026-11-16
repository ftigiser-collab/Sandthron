// Datengetriebene Definitionen für den Rundenmodus
// TP = Trefferpunkte (100 = volle Stärke), Reichweite in Hexfeldern

export const FACTIONS = {
  vareth: { name: 'Haus Vareth', color: '#3fa8ff', motto: 'Ordnung aus dem Sand', perk: { airCost: 0.85, airMove: 1 }, perkText: 'Thopter 15 % günstiger und +1 Bewegung' },
  kordan: { name: 'Haus Kordan', color: '#ff4a3a', motto: 'Stahl über Staub', perk: { vehPower: 1.12, bldHp: 1.2 }, perkText: 'Fahrzeuge +12 % Schaden, Gebäude +20 % stabiler' },
  sandvolk: { name: 'Sandvolk', color: '#e3b341', motto: 'Der Sand vergisst nicht', perk: { svCost: 0.7, svMove: 1 }, perkText: 'Sandvolk-Einheiten 30 % günstiger und +1 Bewegung' },
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
  sandfoot: { sand: 1, dune: 1, rock: 1, mountain: 2 },
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
  turret:    { inf: 1.0, light: 0.85, heavy: 0.5, bld: 0, air: 0 },
  atrocket:  { inf: 0.3, light: 1.05, heavy: 1.3, bld: 0.2, air: 0 },
  sniper:    { inf: 1.35, light: 0.35, heavy: 0.1, bld: 0.05, air: 0 },
  laser:     { inf: 0.6, light: 1.0, heavy: 1.1, bld: 0.9, air: 0.8 },
  desert:    { inf: 1.1, light: 0.8, heavy: 0.35, bld: 0.2, air: 0 },
  crys:      { inf: 1.4, light: 0.6, heavy: 0.3, bld: 0.3, air: 0 },
  flame:     { inf: 1.4, light: 0.9, heavy: 0.4, bld: 1.1, air: 0 },
  siege:     { inf: 0.6, light: 0.95, heavy: 0.95, bld: 1.2, air: 0 },
  bomb:      { inf: 0.8, light: 1.0, heavy: 1.0, bld: 1.3, air: 0 },
  aam:       { inf: 0, light: 0, heavy: 0, bld: 0, air: 1.15 },
  blade:     { inf: 1.25, light: 0.3, heavy: 0.1, bld: 0.1, air: 0 },
  gauss:     { inf: 1.1, light: 0.8, heavy: 0.45, bld: 0.3, air: 0.3 },
};

export const WEAPONS = {
  rifle:     { type: 'rifle', power: 50, range: [1, 1], ground: true, air: false, proj: 'bullet' },
  mg:        { type: 'mg', power: 52, range: [1, 1], ground: true, air: false, proj: 'bullet' },
  cannon:    { type: 'cannon', power: 72, range: [1, 1], ground: true, air: false, proj: 'shell' },
  rocketInf: { type: 'rocket', power: 62, range: [1, 2], ground: true, air: true, proj: 'rocket' },
  artillery: { type: 'artillery', power: 78, range: [2, 4], ground: true, air: false, proj: 'arty', noMoveFire: true, noCounter: true },
  tmg:       { type: 'tmg', power: 48, range: [1, 1], ground: true, air: true, proj: 'bullet' },
  trocket:   { type: 'trocket', power: 70, range: [1, 1], ground: true, air: false, proj: 'rocket', ammo: true },
  sniper:    { type: 'sniper', power: 64, range: [2, 3], ground: true, air: false, proj: 'sniper' },
  laser:     { type: 'laser', power: 72, range: [1, 3], ground: true, air: true, proj: 'laser' },
  desert:    { type: 'desert', power: 58, range: [1, 1], ground: true, air: false, proj: 'bullet' },
  crys:      { type: 'crys', power: 70, range: [1, 1], ground: true, air: false, proj: 'blade' },
  flame:     { type: 'flame', power: 74, range: [1, 1], ground: true, air: false, proj: 'flame' },
  gunship:   { type: 'trocket', power: 64, range: [1, 2], ground: true, air: true, proj: 'rocket' },
  siege:     { type: 'siege', power: 88, range: [1, 2], ground: true, air: false, proj: 'shell' },
  mflak:     { type: 'flak', power: 68, range: [1, 3], ground: false, air: true, proj: 'flak' },
  bombs:     { type: 'bomb', power: 95, range: [0, 1], ground: true, air: false, proj: 'bomb', ammo: true },
  aam:       { type: 'aam', power: 82, range: [1, 2], ground: false, air: true, proj: 'rocket' },
  blade:     { type: 'blade', power: 45, range: [1, 1], ground: true, air: false, proj: 'blade' },
  gauss:     { type: 'gauss', power: 62, range: [1, 1], ground: true, air: true, proj: 'bullet' },
  turretGun: { type: 'turret', power: 68, range: [1, 3], ground: true, air: false, proj: 'shell' },
  towerRocket: { type: 'atrocket', power: 60, range: [1, 3], ground: true, air: false, proj: 'rocket' },
  flak:      { type: 'flak', power: 75, range: [1, 3], ground: false, air: true, proj: 'flak' },
};

export const UNITS = {
  inf:     { name: 'Infanterist', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', weapon: 'rifle', cost: 100, prereq: ['kaserne'], vib: 1,
             desc: 'Günstig und geländegängig — klettert sogar ins Gebirge.' },
  sandgaenger: { name: 'Sandgänger', cat: 'inf', move: 4, mt: 'sandfoot', sight: 3, armor: 'inf', weapon: 'rifle', cost: 400, prereq: ['kaserne', 'ausguck'], vib: 0, thumper: true,
             desc: 'Wüstenkundige Späher. Gehen ohne Rhythmus und locken keine Würmer an, Dünen kosten sie nichts extra. Setzen alle 3 Runden einen Klopfer in bis zu 2 Feldern Entfernung.' },
  scharf:  { name: 'Scharfschütze', cat: 'inf', move: 3, mt: 'foot', sight: 4, armor: 'inf', weapon: 'sniper', cost: 450, prereq: ['kaserne', 'ausguck'], vib: 0.5, stealth: 'still',
             desc: 'Reichweite 2–3, tödlich gegen Infanterie. Getarnt, solange er nicht zieht — der Feind sieht ihn nur aus nächster Nähe. Wehrlos im Nahkampf.' },
  schild:  { name: 'Schildgarde', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', weapon: 'crys', cost: 400, prereq: ['kaserne', 'windfalle'], vib: 1, shield: true,
             desc: 'Persönlicher Schild: Geschosse richten nur 40 % Schaden an. Langsame Klingen, Flammen und Explosionen dringen durch. Laser auf einen Schild lösen eine verheerende Reaktion aus. Der Schild macht Würmer rasend — sie wittern ihn aus großer Entfernung.' },
  pionier: { name: 'Pionier', cat: 'inf', move: 3, mt: 'foot', sight: 2, armor: 'inf', cost: 500, prereq: ['kaserne'], vib: 1, capture: true,
             desc: 'Übernimmt ein angrenzendes feindliches Gebäude (der Pionier geht dabei auf) oder repariert ein eigenes um 50 %.' },
  spion:   { name: 'Spion', cat: 'sis', move: 4, mt: 'foot', sight: 3, armor: 'inf', cost: 450, prereq: ['konvent'], vib: 0.3, stealth: 'always', infiltrate: true,
             desc: 'Unsichtbar außer aus nächster Nähe. Infiltriert ein angrenzendes feindliches Gebäude: 2 Runden Ausfall, stiehlt bis zu 400 Credits, deckt die Umgebung auf.' },
  rak:     { name: 'Raketentrupp', cat: 'inf', move: 2, mt: 'foot', sight: 2, armor: 'inf', weapon: 'rocketInf', cost: 250, prereq: ['kaserne'], vib: 1,
             desc: 'Panzerabwehr zu Fuß, Reichweite 2. Trifft auch Thopter.' },
  trike:   { name: 'Sandläufer', cat: 'veh', move: 7, mt: 'wheel', sight: 3, armor: 'light', weapon: 'mg', cost: 350, prereq: ['fabrik'], vib: 2,
             desc: 'Schnellster Bodenspäher. Hasst Dünen.' },
  panzer:  { name: 'Kampfpanzer', cat: 'veh', move: 4, mt: 'track', sight: 2, armor: 'heavy', weapon: 'cannon', cost: 800, prereq: ['fabrik'], vib: 2,
             desc: 'Rückgrat jeder Armee.' },
  werfer:  { name: 'Raketenwerfer', cat: 'veh', move: 3, mt: 'track', sight: 2, armor: 'light', weapon: 'artillery', cost: 900, prereq: ['fabrik', 'ausguck'], vib: 2,
             desc: 'Reichweite 2–4. Kann nicht ziehen und feuern in derselben Runde.' },
  flakwagen: { name: 'Flakwagen', cat: 'veh', move: 5, mt: 'wheel', sight: 3, armor: 'light', weapon: 'mflak', cost: 600, prereq: ['fabrik'], vib: 2,
             desc: 'Bewegliche Luftabwehr, Reichweite 1–3. Trifft keine Bodenziele.' },
  laserpanzer: { name: 'Laserpanzer', cat: 'veh', move: 4, mt: 'track', sight: 3, armor: 'heavy', weapon: 'laser', turret: true, cost: 1300, prereq: ['fabrik', 'ausguck'], vib: 2,
             desc: 'Laserlanze mit Reichweite 1–3, trifft auch Thopter. Gegen Schilde verheerend — aber die Reaktion trifft auch ihn selbst.' },
  koloss:  { name: 'Belagerungskoloss', cat: 'veh', move: 2, mt: 'track', sight: 2, armor: 'heavy', weapon: 'siege', turret: true, cost: 1700, prereq: ['fabrik', 'ausguck'], vib: 4, tough: 0.6,
             desc: 'Kriegsmaschine auf sechs Ketten: erleidet nur 60 % Schaden, Kanone mit Reichweite 1–2, stark gegen Gebäude. Langsam und laut — Würmer lieben ihn.' },
  ernter:  { name: 'Ernter', cat: 'veh', move: 4, mt: 'track', sight: 2, armor: 'heavy', cost: 800, prereq: ['raffinerie'], refOnly: true, vib: 4, harvester: true, capacity: 750, rate: 300,
             desc: 'Erntet bis zu 250 Glut pro Runde, fasst 750. Lockt Würmer stark an.' },
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
  duenen:  { name: 'Dünenkrieger', cat: 'sv', move: 4, mt: 'sandfoot', sight: 3, armor: 'inf', weapon: 'desert', cost: 450, prereq: ['felsenhort'], vib: 0, stealth: 'sand',
             desc: 'Krieger des Sandvolks: locken keine Würmer an, im Sand getarnt, Dünen kosten nichts extra.' },
  todes:   { name: 'Todeskommando', cat: 'sv', move: 4, mt: 'sandfoot', sight: 3, armor: 'inf', weapon: 'crys', cost: 750, prereq: ['felsenhort', 'ausguck'], vib: 0, stealth: 'sand', elite: 0.75,
             desc: 'Elite des Sandvolks mit Kristallklingen: erleidet nur 75 % Schaden, vernichtet Infanterie im Nahkampf, im Sand getarnt.' },
  wurmreiter: { name: 'Wurmreiter', cat: 'sv', move: 4, mt: 'sandfoot', sight: 3, armor: 'inf', weapon: 'desert', cost: 900, prereq: ['felsenhort'], vib: 0, callWorm: true, faction: 'sandvolk',
             desc: 'Ruft alle 4 Runden einen Großen Wurm auf ein Sandfeld in bis zu 5 Feldern: Er bricht in der nächsten Wurmphase hervor und verschlingt alles in 3 Feldern.' },
  adler:   { name: 'Sturmadler', cat: 'air', move: 7, mt: 'air', sight: 3, armor: 'air', weapon: 'gunship', cost: 1400, prereq: ['horst', 'ausguck'], tough: 0.8, faction: 'vareth',
             desc: 'Schwerer Kampf-Thopter von Haus Vareth: Raketenkanonen mit Reichweite 1–2 gegen Boden und Luft, keine Munitionsgrenze, gepanzert (80 % Schaden).' },
  brenner: { name: 'Brenner', cat: 'veh', move: 4, mt: 'track', sight: 2, armor: 'heavy', weapon: 'flame', cost: 1000, prereq: ['fabrik'], vib: 2, faction: 'kordan',
             desc: 'Flammenpanzer von Haus Kordan: verheerend gegen Infanterie und Gebäude, Flammen durchdringen Schilde. Nur Nahbereich.' },
  schatten: { name: 'Schattenklinge', cat: 'inf', move: 4, mt: 'foot', sight: 3, armor: 'inf', weapon: 'crys', cost: 600, prereq: ['kaserne'], vib: 0.3, stealth: 'always', elite: 0.85, faction: 'ossar',
             desc: 'Attentäter des Ossar-Syndikats: immer getarnt, Kristallklinge gegen Infanterie, erleidet nur 85 % Schaden.' },
  soeldner: { name: 'Gilden-Söldner', cat: 'drop', move: 3, mt: 'foot', sight: 2, armor: 'inf', weapon: 'gauss', cost: 0, vib: 1,
             desc: 'Elite-Infanterie der Gilde, nur per Orbital-Drop. Gaußgewehr trifft auch Thopter.' },
  legionaer: { name: 'Kaiserlicher Legionär', cat: 'drop', move: 3, mt: 'foot', sight: 2, armor: 'inf', weapon: 'gauss', cost: 0, vib: 1, tough: 0.55,
             desc: 'Gefürchtete Elitelegion des Kaisers, nur über die Kaiserliche Legion. Nimmt kaum Schaden, Gaußgewehr trifft auch Thopter.' },
  apc:     { name: 'Truppentransporter', cat: 'veh', move: 5, mt: 'wheel', sight: 2, armor: 'light', weapon: 'mg', cost: 700, prereq: ['fabrik'], vib: 2.5, transport: 2,
             desc: 'Gepanzerter Sechsradtransporter für zwei Infanterietrupps. Einsteigen von einem Nachbarfeld, Aussteigen auf freie Nachbarfelder — ausgestiegene Trupps können noch angreifen. Wird er zerstört, sterben die Insassen.' },
  erntetraeger: { name: 'Ernte-Träger', cat: 'air', move: 9, mt: 'air', sight: 2, armor: 'air', cost: 900, prereq: ['raffinerie'], carrier: true, harvOnly: true, refOnly: true,
             desc: 'Breiter Lastenträger, kommt mit jeder Raffinerie und lässt sich dort nachbauen (einer je Raffinerie). Trägt ausschließlich Ernter: fliegt volle heim und leere zurück aufs Feld.' },
  traeger: { name: 'Träger-Thopter', cat: 'air', move: 8, mt: 'air', sight: 2, armor: 'air', cost: 650, prereq: ['horst'], carrier: true,
             desc: 'Lufttransport für Bodeneinheiten. Im Auto-Modus holt er Ernter von weit entfernten Feldern, bringt sie zur Raffinerie und rettet sie vor Würmern.' },
};

// Etwas weitere Sicht für alle Einheiten
for (const u of Object.values(UNITS)) u.sight = (u.sight || 1) + 1;

export const BUILDINGS = {
  bauhof:     { name: 'Bauhof', hp: 300, power: 10, cost: 3000, turns: 0, sight: 3, buildable: false,
                desc: 'Herz der Basis. Errichtet ein Gebäude pro Runde und bringt 150 Credits Grundeinkommen.' },
  windfalle:  { name: 'Windfalle', cat: 'bld', hp: 150, power: 100, cost: 300, turns: 1, sight: 2, prereq: ['bauhof'],
                desc: 'Gewinnt Energie aus Wind und Luftfeuchte.' },
  raffinerie: { name: 'Raffinerie', cat: 'bld', hp: 220, power: -30, cost: 1400, turns: 2, sight: 2, prereq: ['windfalle'], freeUnit: ['ernter', 'erntetraeger'], producesTypes: ['ernter', 'erntetraeger'],
                desc: 'Ernter laden hier ab. Kommt mit einem Ernter und einem Ernte-Träger, der die Ernter zwischen Feld und Raffinerie fliegt. Credits gibt es erst, wenn ein Ernter hier abgeladen hat. Die Erschütterungen der Basis halten Würmer auf 2 Felder Abstand.' },
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
  felsenhort: { name: 'Felsenhort', cat: 'bld', hp: 200, power: 0, cost: 900, turns: 2, sight: 3, prereq: ['raffinerie'], produces: 'sv',
                desc: 'Bündnis mit dem Sandvolk: bildet Dünenkrieger, Todeskommandos und Wurmreiter aus. Braucht keine Energie.' },
  turm:       { name: 'Geschützturm', cat: 'def', hp: 200, power: -15, cost: 500, turns: 1, sight: 3, prereq: ['kaserne'], weapon: 'turretGun',
                desc: 'Bodenabwehr gegen Infanterie und leichte Fahrzeuge, Reichweite 3. Feuert automatisch am Rundenende.' },
  raketenturm: { name: 'Raketenturm', cat: 'def', hp: 210, power: -20, cost: 750, turns: 1, sight: 3, prereq: ['fabrik'], weapon: 'towerRocket',
                desc: 'Panzerabwehr: Raketen gegen Fahrzeuge und Panzer, Reichweite 3. Gegen Infanterie schwach. Feuert automatisch am Rundenende.' },
  flak:       { name: 'Flakstellung', cat: 'def', hp: 160, power: -20, cost: 600, turns: 1, sight: 3, prereq: ['ausguck'], weapon: 'flak',
                desc: 'Luftabwehr, Reichweite 3. Feuert automatisch am Rundenende.' },
};

// Schlüsselorte auf der Karte: einnehmen, indem eine eigene Bodeneinheit zu Beginn des eigenen Zuges darauf steht
export const POIS = {
  zisterne:   { name: 'Alte Zisterne', icon: '💧', text: '+120 Credits pro Runde. Wasser ist auf dieser Welt mehr wert als Glut.' },
  warte:      { name: 'Sturmwarte', icon: '📡', text: '+40 Credits pro Runde und große Sicht (5 Felder) rund um die Warte.' },
  schmuggler: { name: 'Schmugglerlager', icon: '📦', text: 'Orbitale Drops 25 % günstiger und alle drei Runden eine Intrigenkarte.' },
  heiligtum:  { name: 'Felsenheiligtum', icon: '⛰', text: 'Eigene Einheiten auf und neben dem Heiligtum heilen 15 pro Runde. Wer darauf steht, erhält 25 % Deckung.' },
};

// Erfahrung: Ränge mit Schwellen und Boni
export const RANKS = [
  { name: 'Rekrut', xp: 0, dmg: 1, taken: 1 },
  { name: 'Veteran', xp: 50, dmg: 1.1, taken: 0.94 },
  { name: 'Elite', xp: 130, dmg: 1.2, taken: 0.88, sight: 1 },
  { name: 'Held', xp: 260, dmg: 1.3, taken: 0.8, sight: 1, move: 1, regen: 10 },
];

export const WORM_SIZES = {
  1: { name: 'Sandwurm', steps: 3, sated: 3, weight: 60, scale: 1 },
  2: { name: 'Großer Wurm', steps: 4, sated: 3, weight: 30, scale: 1.4 },
  3: { name: 'Uralter Wurm', steps: 5, sated: 4, weight: 10, scale: 1.9 },
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
  garde:  { name: 'Schildgarde-Kohorte', units: ['schild', 'schild', 'scharf'], cost: 1300, desc: 'Zwei Schildgarden und ein Scharfschütze.' },
  ernter: { name: 'Ernter-Lieferung', units: ['ernter'], cost: 1300, desc: 'Ein Ernter, abgesetzt direkt an einem Glutfeld.' },
};

// Endgame: je Fraktion ein entscheidender Schlag für sehr viel Glut, damit Partien zu einem Ende kommen
export const ENDGAME = {
  ossar:    { name: 'Kaiserliche Legion', ship: 'Legionsträger', cost: 8000, units: ['legionaer', 'legionaer', 'legionaer', 'legionaer', 'legionaer', 'legionaer'],
              desc: 'Ein riesiger Legionsträger setzt sechs Trupps Kaiserlicher Legionäre ab: fast unverwundbare Elite-Infanterie.' },
  vareth:   { name: 'Himmelsflotte', ship: 'Flottenträger', cost: 8000, units: ['adler', 'adler', 'falke', 'falke', 'bomber', 'bomber'],
              desc: 'Ein Flottenträger öffnet seine Hangars über dem Ziel: zwei Sturmadler, zwei Kampf-Thopter und zwei Bomber.' },
  kordan:   { name: 'Eiserne Landung', ship: 'Schwerlastlander', cost: 8000, units: ['koloss', 'koloss', 'laserpanzer', 'laserpanzer', 'panzer'],
              desc: 'Ein Schwerlastlander setzt ein Panzerbataillon ab: zwei Kolosse, zwei Laserpanzer und ein Kampfpanzer.' },
  sandvolk: { name: 'Ruf des Uralten', ship: null, cost: 8000, units: ['wurmreiter', 'todes', 'todes', 'duenen', 'duenen', 'duenen'],
              desc: 'Ein Uralter Wurm bricht am Ziel hervor und verschlingt feindliche Einheiten im Sand. Auf seinem Rücken kommt ein Wüstenheer.' },
};
export const ENDGAME_ROUND = 8;

export const ORBITAL_STRIKE = { cost: 2500, cooldown: 6, radius: 1, unitDmg: 65, bldDmg: 0.45 };
export const SHIELD_PIERCE = ['blade', 'crys', 'artillery', 'bomb', 'siege', 'flak', 'laser', 'flame'];

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
export const RICH_MULT = 1.75; // Tiefglut: Credits je Einheit Ladung
