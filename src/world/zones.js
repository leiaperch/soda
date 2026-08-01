/**
 * Zone definitions. A zone is an ambience AND a mechanic; this file owns the
 * ambience half. Everything the generator needs to make one stretch of road
 * look nothing like another lives here, so adding a zone never means editing
 * the chunk builder.
 *
 * `built: false` zones appear on the select screen as locked. They are listed
 * rather than hidden on purpose: the player should be able to see where the
 * game is going.
 */

export const ZONES = [
  {
    id: 'ring',
    name: 'THE RING',
    subtitle: 'PASTEL ORBITAL AVENUE',
    mechanic: 'Three lanes. Jump, slide, survive.',
    built: true,
    length: 1400,
    sky: [
      [0.00, '#2a1450'], [0.28, '#7a3d9c'], [0.50, '#ff7ac6'],
      [0.68, '#ffb27a'], [0.82, '#ffe9c9'], [1.00, '#7ff0d4'],
    ],
    fog: { color: '#ff9fd0', near: 230, far: 400 },
    sun: { color: '#fff0d8', intensity: 2.4 },
    hemi: { sky: '#ffd9f0', ground: '#4a2a7a', intensity: 0.38 },
    backdrop: { sun: '#fff4d6', halo: '#ffb27a', arc: '#e6c9ff', planet: '#8f6fd6' },
    colors: {
      road: '#3b2360',
      kerb: '#f7e3cf',
      deck: '#8b6fd0',
      edge: '#ff7ac6',
      lane: '#fff2e0',
      accent: '#ffd6ef',
      accentGlow: '#ff7ac6',
    },
    facades: ['#ffc2e2', '#c9b6ff', '#a8ecda', '#ffd9b0', '#e9d5ff', '#bfe3ff'],
    props: {
      arches: 'round', archEvery: 24, archTint: ['#ff7ac6', '#7ff0d4', '#b79bff'],
      lampEvery: 12, streetEvery: 16, billboardChance: 0.7,
      palmChance: 0.5, podChance: 0.5, stallChance: 0,
      skylineChance: 0.72, backRowChance: 0.55, waterSides: false,
      lotMin: 8, lotMax: 16, towerStacks: [2, 4], feature: null,
    },
  },

  {
    id: 'shore',
    name: 'THE SHORE',
    subtitle: 'ARTIFICIAL OCEAN, GOLDEN HOUR',
    mechanic: 'Surf the swell. Waves taken clean give a boost.',
    built: true,
    length: 1900,
    sky: [
      [0.00, '#0e3f74'], [0.20, '#2f8fc0'], [0.36, '#8fd8e8'],
      [0.47, '#ffd9a0'], [0.54, '#ff9d6e'], [0.72, '#ffc9a0'], [1.00, '#ffe9d0'],
    ],
    fog: { color: '#ffd0a0', near: 210, far: 380 },
    sun: { color: '#fff0cf', intensity: 2.7 },
    hemi: { sky: '#bfe8ff', ground: '#2f6f8f', intensity: 0.5 },
    backdrop: { sun: '#fff3cf', halo: '#ff9d6e', arc: '#cfeaff', planet: '#6fc6d6' },
    colors: {
      road: '#1d5c6e',
      kerb: '#ffe9c2',
      deck: '#f4d9a8',
      edge: '#7fe6ff',
      lane: '#fff8e6',
      accent: '#ffe9c2',
      accentGlow: '#7fe6ff',
    },
    facades: ['#fff0d2', '#ffd9b0', '#bfeef0', '#ffc6a8', '#e8f6d8', '#ffe9f2'],
    props: {
      arches: 'none', archEvery: 0, archTint: ['#7fe6ff'],
      lampEvery: 18, streetEvery: 10, billboardChance: 0.15,
      palmChance: 0.95, podChance: 0.2, stallChance: 0,
      skylineChance: 0.35, backRowChance: 0.12, waterSides: true,
      lotMin: 10, lotMax: 20, towerStacks: [1, 2], feature: 'swell',
    },
  },

  {
    id: 'market',
    name: 'THE MARKET',
    subtitle: 'NEON NIGHT, NARROW AND LOUD',
    mechanic: 'Grind the rails to clear the crowd.',
    built: true,
    length: 2400,
    sky: [
      [0.00, '#08061c'], [0.30, '#1d0f3a'], [0.52, '#4a1155'],
      [0.70, '#8e1d63'], [0.86, '#d63b7a'], [1.00, '#2a0b3f'],
    ],
    fog: { color: '#4a1155', near: 150, far: 300 },
    sun: { color: '#ffb9e6', intensity: 1.1 },
    hemi: { sky: '#ff86d0', ground: '#140828', intensity: 0.42 },
    backdrop: { sun: '#ffd9f2', halo: '#ff2e93', arc: '#7a4fd0', planet: '#3a1f6a' },
    colors: {
      road: '#160c26',
      kerb: '#3a2350',
      deck: '#241238',
      edge: '#ffb02e',
      lane: '#ffe9a8',
      accent: '#ff2e93',
      accentGlow: '#ffb02e',
    },
    facades: ['#2c1740', '#3a1d33', '#241a44', '#40203a', '#1e1436', '#35163f'],
    props: {
      arches: 'gantry', archEvery: 16, archTint: ['#ff2e93', '#ffb02e', '#7fdcff'],
      lampEvery: 8, streetEvery: 6, billboardChance: 1,
      palmChance: 0.1, podChance: 0.3, stallChance: 0.9,
      skylineChance: 0.95, backRowChance: 0.85, waterSides: false,
      lotMin: 5, lotMax: 10, towerStacks: [3, 5], feature: 'rail',
    },
  },

  { id: 'docks', name: 'THE DOCKS', subtitle: 'ZERO-G CARGO SPIRAL', mechanic: 'The track wraps around you.', built: false, length: 2800 },
  { id: 'heights', name: 'THE HEIGHTS', subtitle: 'UPPER ATMOSPHERE', mechanic: 'A crosswind you have to fight the whole way.', built: false, length: 3200 },
  { id: 'core', name: 'THE CORE', subtitle: 'TERMINAL DESCENT', mechanic: 'Everything at once, and faster.', built: false, length: 3600 },
];

export const DEFAULT_ZONE = ZONES[0];

export function getZone(id) {
  return ZONES.find((z) => z.id === id) || DEFAULT_ZONE;
}
