import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buildingsPath = path.resolve(__dirname, '../../src/lib/byu-buildings.json');

let buildings = [];
try {
  buildings = JSON.parse(fs.readFileSync(buildingsPath, 'utf8'));
} catch (e) {
  console.warn('[BuildingResolver] Could not load byu-buildings.json:', e.message);
}

const ALIASES = [
  { pattern: /\b(wsc|wilkinson)\b/i, code: 'WSC', name: 'Wilkinson Student Center' },
  { pattern: /\b(jfsb|joseph f\.? smith)\b/i, code: 'JFSB', name: 'Joseph F. Smith Building' },
  { pattern: /\b(jkb|jesse knight)\b/i, code: 'JKB', name: 'Jesse Knight Building' },
  { pattern: /\b(tmcb|talmage)\b/i, code: 'TMCB', name: 'Talmage Building' },
  { pattern: /\b(marb|thomas l\.? martin)\b/i, code: 'MARB', name: 'Martin Building' },
  { pattern: /\b(tnrb|tanner|n\.? eldon tanner)\b/i, code: 'TNRB', name: 'Tanner Building' },
  { pattern: /\b(eb|engineering building)\b/i, code: 'EB', name: 'Engineering Building' },
  { pattern: /\b(cb|crabtree)\b/i, code: 'CB', name: 'Crabtree Building' },
  { pattern: /\b(esc|eyring|eyring science)\b/i, code: 'ESC', name: 'Eyring Science Center' },
  { pattern: /\b(hbll|harold b\.? lee|library)\b/i, code: 'HBLL', name: 'Harold B. Lee Library' },
  { pattern: /\b(rb|richards)\b/i, code: 'RB', name: 'Richards Building' },
  { pattern: /\b(sfh|smith fieldhouse)\b/i, code: 'SFH', name: 'Smith Fieldhouse' },
  { pattern: /\b(hfac|harris fine arts)\b/i, code: 'HFAC', name: 'Harris Fine Arts Center' },
  { pattern: /\b(moa|museum of art)\b/i, code: 'MOA', name: 'Museum of Art' },
  { pattern: /\b(bean|bean museum|life science museum)\b/i, code: 'MLBM', name: 'Bean Life Science Museum' },
  { pattern: /\b(benson|bnsn)\b/i, code: 'BNSN', name: 'Benson Building' },
  { pattern: /\b(jsb|joseph smith building)\b/i, code: 'JSB', name: 'Joseph Smith Building' },
  { pattern: /\b(hceb|harman)\b/i, code: 'HCEB', name: 'Harman Continuing Education' },
  { pattern: /\b(kmbl|spencer w\.? kimball)\b/i, code: 'KMBL', name: 'Kimball Tower' },
  { pattern: /\b(mcb|mouson|magrath)\b/i, code: 'MCB', name: 'Magrath Computer Building' },
];

export function extractRoom(rawLocation) {
  if (!rawLocation) return null;
  const roomMatch =
    rawLocation.match(/\b(?:room\s*)?([A-Z]?\d{3,4}[A-Z]?)\b/i) ||
    rawLocation.match(/(garden court|varsity theat(?:er|re)|center stage|assembly hall|gallery|west parking lot)/i);
  return roomMatch ? roomMatch[0].trim() : null;
}

export function resolveBuilding(rawLocation) {
  if (!rawLocation) {
    return {
      building: 'BYU Campus',
      room: null,
      latitude: 40.2494,
      longitude: -111.6493,
      building_id: 'BYU',
      address: 'Brigham Young University, Provo, UT 84602',
    };
  }

  const loc = rawLocation.trim().toLowerCase();

  for (const alias of ALIASES) {
    if (alias.pattern.test(loc)) {
      const match = buildings.find((b) => b.code.toUpperCase() === alias.code.toUpperCase());
      const bName = match?.label || match?.name || alias.name;
      return {
        building: bName,
        room: extractRoom(rawLocation),
        latitude: match ? match.lat : null,
        longitude: match ? match.lng : null,
        building_id: alias.code,
        address: `${bName}, BYU Campus, Provo, UT 84602`,
      };
    }
  }

  // Fallback fuzzy search
  for (const b of buildings) {
    const code = b.code.toLowerCase();
    const name = b.name.toLowerCase();
    const label = (b.label || '').toLowerCase();
    if (loc.includes(code) || loc.includes(name) || (label && loc.includes(label))) {
      const bName = b.label || b.name;
      return {
        building: bName,
        room: extractRoom(rawLocation),
        latitude: b.lat,
        longitude: b.lng,
        building_id: b.code,
        address: `${bName}, BYU Campus, Provo, UT 84602`,
      };
    }
  }

  // Off campus or unmapped venue
  const cleanBuilding = rawLocation.split('-')[0].trim() || rawLocation;
  return {
    building: cleanBuilding,
    room: extractRoom(rawLocation),
    latitude: null,
    longitude: null,
    building_id: null,
    address: `${cleanBuilding}, Provo, UT`,
  };
}
