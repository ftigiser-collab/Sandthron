// Spielstände: fünf Plätze plus Autospeicher im lokalen Speicher des Geräts
export const SLOTS = 5;
const key = (k) => `sandthron-slot-${k}`;

export function readAuto() { try { const d = JSON.parse(localStorage.getItem('sandthron-save') || 'null'); return d && d.v === 2 ? d : null; } catch { return null; } }
export function slotMeta(k) { try { const d = JSON.parse(localStorage.getItem(key(k)) || 'null'); return d ? d.meta : null; } catch { return null; } }
export function readSlot(k) { try { const d = JSON.parse(localStorage.getItem(key(k)) || 'null'); return d ? JSON.parse(d.data) : null; } catch { return null; } }
export function deleteSlot(k) { try { localStorage.removeItem(key(k)); } catch {} }
export function writeSlot(k, game) {
  const data = game.serialize();
  const meta = {
    date: new Date().toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
    round: game.round, factions: game.players.map((p) => p.faction), out: game.players.map((p) => !!p.out),
    size: `${game.W}×${game.H}`, mission: game.mission ? game.mission.title : null, credits: Math.round(game.players[0].credits),
  };
  try { localStorage.setItem(key(k), JSON.stringify({ meta, data })); return true; } catch (e) { return false; }
}
export function metaFromSave(d) {
  return d ? { round: d.round, factions: d.players.map((p) => p.faction), out: d.players.map((p) => !!p.out), size: `${d.W || 30}×${d.H || 22}`, credits: Math.round(d.players[0].credits) } : null;
}
