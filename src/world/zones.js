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
      skylineChance: 0.35, backRowChance: 0.12, waterSides: true, waterRoad: true,
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

  {
    id: 'docks',
    name: 'THE DOCKS',
    subtitle: 'ZERO-G CARGO YARD',
    mechanic: 'Gravity gives up. Long, floating jumps.',
    built: true,
    length: 2800,
    track: 'audio/emo-hyperpop.mp3',
    // Low gravity with a slightly softer push: she hangs, so a jump becomes a
    // commitment you cannot take back rather than a tap.
    physics: { gravityScale: 0.42, jumpScale: 0.82 },
    sky: [
      [0.00, '#04060f'], [0.26, '#0d1738'], [0.46, '#1d2f66'],
      [0.62, '#3a5aa8'], [0.80, '#6f8fd0'], [1.00, '#101a33'],
    ],
    fog: { color: '#1d2f66', near: 170, far: 330 },
    sun: { color: '#dce8ff', intensity: 1.9 },
    hemi: { sky: '#8fb0ff', ground: '#0a1024', intensity: 0.42 },
    backdrop: { sun: '#e8f2ff', halo: '#5b7fd0', arc: '#9fb8e8', planet: '#2a4a8a' },
    colors: {
      road: '#1b2340',
      kerb: '#c8d4ea',
      deck: '#2a3557',
      edge: '#7fd0ff',
      lane: '#eaf4ff',
      accent: '#c8d4ea',
      accentGlow: '#ffb02e',
    },
    facades: ['#3a4a72', '#5a4a6e', '#2f5a6e', '#6e5a4a', '#44557d', '#3f6a72'],
    props: {
      arches: 'gantry', archEvery: 22, archTint: ['#7fd0ff', '#ffb02e'],
      lampEvery: 14, streetEvery: 14, billboardChance: 0.3,
      palmChance: 0, podChance: 0.7, stallChance: 0,
      skylineChance: 0.9, backRowChance: 0.5, waterSides: false, waterRoad: false,
      lotMin: 8, lotMax: 16, towerStacks: [2, 3], feature: null,
      cargoChance: 0.75,
    },
  },

  {
    id: 'heights',
    name: 'THE HEIGHTS',
    subtitle: 'ABOVE THE WEATHER',
    mechanic: 'A crosswind you fight the whole way.',
    built: true,
    length: 3200,
    track: 'audio/the-heights.mp3',
    physics: { wind: 1.15 },
    sky: [
      [0.00, '#2c6fd0'], [0.24, '#7fb8f0'], [0.44, '#cfe8ff'],
      [0.60, '#ffe6f2'], [0.78, '#ffd0e4'], [1.00, '#ffffff'],
    ],
    fog: { color: '#dceaff', near: 190, far: 360 },
    sun: { color: '#ffffff', intensity: 2.9 },
    hemi: { sky: '#ffffff', ground: '#9fc0e8', intensity: 0.66 },
    backdrop: { sun: '#ffffff', halo: '#ffd9ee', arc: '#dceaff', planet: '#a8c8f0' },
    colors: {
      road: '#5a6f9e',
      kerb: '#ffffff',
      deck: '#b9cbe8',
      edge: '#ff7ac6',
      lane: '#ffffff',
      accent: '#ffffff',
      accentGlow: '#ff7ac6',
    },
    facades: ['#ffffff', '#eaf2ff', '#ffe6f2', '#dcecff', '#fff4e8', '#e8e0ff'],
    props: {
      arches: 'round', archEvery: 30, archTint: ['#ff7ac6', '#ffffff'],
      lampEvery: 16, streetEvery: 20, billboardChance: 0.1,
      palmChance: 0, podChance: 0.35, stallChance: 0,
      skylineChance: 0.45, backRowChance: 0.3, waterSides: false, waterRoad: false,
      lotMin: 12, lotMax: 22, towerStacks: [3, 5], feature: null,
      cloudChance: 0.95,
    },
  },

  {
    id: 'core',
    name: 'THE CORE',
    subtitle: 'TERMINAL DESCENT',
    mechanic: 'Everything at once, and faster.',
    built: true,
    length: 3600,
    track: 'audio/the-core.mp3',
    physics: { wind: 0.55, startSpeed: 25, maxSpeed: 54, speedRamp: 0.34 },
    sky: [
      [0.00, '#120206'], [0.26, '#3d0812'], [0.48, '#8e1a1a'],
      [0.66, '#e0521a'], [0.82, '#ffa53a'], [1.00, '#2a0608'],
    ],
    fog: { color: '#8e1a1a', near: 140, far: 290 },
    sun: { color: '#ffd0a0', intensity: 1.6 },
    hemi: { sky: '#ff8a4a', ground: '#1a0308', intensity: 0.5 },
    backdrop: { sun: '#fff0c0', halo: '#ff5a1a', arc: '#c04a2a', planet: '#5a1010' },
    colors: {
      road: '#1a0d12',
      kerb: '#4a1f1a',
      deck: '#2a1014',
      edge: '#ff5a1a',
      lane: '#ffd98a',
      accent: '#ff2e5a',
      accentGlow: '#ff8a1a',
    },
    facades: ['#3a121a', '#4a1a12', '#2a0e18', '#521c14', '#331020', '#40161a'],
    props: {
      arches: 'gantry', archEvery: 14, archTint: ['#ff5a1a', '#ff2e5a', '#ffd98a'],
      lampEvery: 8, streetEvery: 7, billboardChance: 0.9,
      palmChance: 0, podChance: 0.3, stallChance: 0.4,
      skylineChance: 1, backRowChance: 0.9, waterSides: false, waterRoad: false,
      lotMin: 5, lotMax: 9, towerStacks: [3, 5], feature: 'rail',
    },
  },
];

export const DEFAULT_ZONE = ZONES[0];

export function getZone(id) {
  return ZONES.find((z) => z.id === id) || DEFAULT_ZONE;
}
