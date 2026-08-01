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
    track: 'audio/sugar-crash.mp3',
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
      road: 'street',
      obstacleKit: { barrier: 'fence', gate: 'gantry', block: 'pillar' },
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
    track: 'audio/surf-punk.mp3',
    sky: [
      [0.00, '#0e3f74'], [0.20, '#2f8fc0'], [0.36, '#8fd8e8'],
      [0.47, '#ffd9a0'], [0.54, '#ff9d6e'], [0.72, '#ffc9a0'], [1.00, '#ffe9d0'],
    ],
    fog: { color: '#ffd0a0', near: 210, far: 380 },
    sun: { color: '#fff0cf', intensity: 2.7 },
    hemi: { sky: '#bfe8ff', ground: '#2f6f8f', intensity: 0.5 },
    backdrop: { sun: '#fff3cf', halo: '#ff9d6e', arc: '#cfeaff', planet: '#6fc6d6' },
    colors: {
      road: '#2f9fb0',
      kerb: '#ffe9c2',
      deck: '#f4d9a8',
      edge: '#8ff0e6',
      lane: '#ffffff',
      accent: '#ffd98a',
      accentGlow: '#ff9d6e',
    },
    facades: ['#fff0d2', '#ffd9b0', '#bfeef0', '#ffc6a8', '#e8f6d8', '#ffe9f2'],
    props: {
      // Open sea: no kerb, no deck, no rail, no lamps. Everything that made it
      // read as "a road with water on it" is simply not emitted.
      road: 'sea',
      obstacleKit: { barrier: 'rock', gate: 'net', block: 'wreck' },
      arches: 'none', archEvery: 0, archTint: ['#7fe6ff'],
      lampEvery: 0, streetEvery: 0, billboardChance: 0,
      palmChance: 0, podChance: 0, stallChance: 0,
      skylineChance: 0.22, backRowChance: 0.05, waterSides: false,
      lotMin: 14, lotMax: 26, towerStacks: [1, 2], feature: 'swell',
    },
  },

  {
    id: 'dunes',
    name: 'THE SUGAR FLATS',
    subtitle: 'PINK SAND, CANDY SUN',
    mechanic: 'Real hills. You lose speed climbing and get it back falling.',
    built: true,
    length: 2000,
    track: 'audio/neon-tides.mp3',
    physics: { maxSpeed: 40 },
    // A brown desert is a fine desert and completely off-brief. Pink sand
    // under a mint sky is the same landform in the right language.
    sky: [
      [0.00, '#5a2a8a'], [0.24, '#b455c8'], [0.44, '#ff86d0'],
      [0.60, '#ffc2e2'], [0.78, '#ffe9a8'], [1.00, '#8ff0d8'],
    ],
    fog: { color: '#ffb8dc', near: 200, far: 380 },
    sun: { color: '#fff4e0', intensity: 2.6 },
    hemi: { sky: '#ffd9f0', ground: '#c88ab0', intensity: 0.52 },
    backdrop: { sun: '#fffbe8', halo: '#ff86d0', arc: '#d8b0ff', planet: '#8ff0d8' },
    colors: {
      road: '#7a4a72',
      kerb: '#ffe4f2',
      deck: '#ffc0d8',
      edge: '#7ff0d4',
      lane: '#fffaf0',
      accent: '#ffd9ee',
      accentGlow: '#ff5db1',
    },
    facades: ['#ffc2e2', '#ffe0b8', '#c9b6ff', '#a8ecda', '#ffd0e8', '#e8d8ff'],
    props: {
      road: 'street',
      // The one thing no other zone has: the road actually goes up and down.
      hill: 4.6,
      obstacleKit: { barrier: 'rock', gate: 'net', block: 'wreck' },
      arches: 'none', archEvery: 0, archTint: ['#ffd06a', '#ff8a3a'],
      lampEvery: 20, streetEvery: 12, billboardChance: 0.1,
      palmChance: 0.7, podChance: 0.15, stallChance: 0,
      skylineChance: 0.3, backRowChance: 0.15, waterSides: false, waterRoad: false,
      lotMin: 12, lotMax: 24, towerStacks: [1, 2], feature: null,
    },
  },

  {
    id: 'market',
    name: 'THE MARKET',
    subtitle: 'NEON NIGHT, NARROW AND LOUD',
    mechanic: 'Grind the rails to clear the crowd.',
    built: true,
    length: 2400,
    track: 'audio/glitch-in-the-velvet-rope.mp3',
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
      road: 'street',
      obstacleKit: { barrier: 'crate', gate: 'gantry', block: 'pillar' },
      arches: 'gantry', archEvery: 16, archTint: ['#ff2e93', '#ffb02e', '#7fdcff'],
      lampEvery: 8, streetEvery: 6, billboardChance: 1,
      palmChance: 0.1, podChance: 0.3, stallChance: 0.9,
      skylineChance: 0.95, backRowChance: 0.85, waterSides: false,
      lotMin: 5, lotMax: 10, towerStacks: [3, 5], feature: 'rail',
    },
  },

  {
    id: 'greenhouse',
    name: 'THE GREENHOUSE',
    subtitle: 'THE BIODOME WENT FERAL',
    mechanic: 'Hedges block every lane. Only a bloom pad clears them.',
    built: true,
    length: 2100,
    track: 'audio/glitter-and-grit.mp3',
    // Speed is capped because the pad-to-hedge distance is fixed: too fast and
    // you reach the hedge before the boosted arc has lifted you over it.
    // At 28 the arc is 4.0 m high at the hedge against a 3.2 m hedge.
    physics: { gravityScale: 0.72, maxSpeed: 28, speedRamp: 0.18 },
    sky: [
      [0.00, '#0f3a24'], [0.26, '#1f6b3f'], [0.48, '#7fd06a'],
      [0.66, '#ffe9a0'], [0.82, '#ffd0e4'], [1.00, '#2a5a3a'],
    ],
    fog: { color: '#9fd8a0', near: 160, far: 310 },
    sun: { color: '#fff6d0', intensity: 2.5 },
    hemi: { sky: '#cfffd0', ground: '#1a3d22', intensity: 0.5 },
    backdrop: { sun: '#fff8d8', halo: '#a8e86a', arc: '#cfeeb0', planet: '#4a8a4a' },
    colors: {
      road: '#4a4436',
      kerb: '#e8dcc0',
      deck: '#7a8a56',
      edge: '#5cc472',
      lane: '#fff6d0',
      accent: '#ff9ec8',
      accentGlow: '#ffd84a',
    },
    facades: ['#8fbf78', '#d8e0b0', '#6fa860', '#c8d89a', '#a8cc84', '#e8e8c8'],
    props: {
      road: 'street',
      obstacleKit: { barrier: 'log', gate: 'vine', block: 'tree' },
      // A glass vault over the track and beds spilling onto the kerb: the
      // silhouette has to change, not just the colour.
      arches: 'glass', archEvery: 11, archTint: ['#6fe08a', '#ffe066', '#ffb0e0'],
      lampEvery: 22, streetEvery: 6, billboardChance: 0,
      palmChance: 0, podChance: 0, stallChance: 0, bedChance: 0.85,
      skylineChance: 0.5, backRowChance: 0.25, waterSides: false, waterRoad: false,
      lotMin: 8, lotMax: 16, towerStacks: [1, 2], feature: 'spring',
    },
  },

  {
    id: 'docks',
    name: 'THE DOCKS',
    subtitle: 'ZERO-G CARGO YARD',
    mechanic: 'The catwalk runs out. Float across the gaps.',
    built: true,
    length: 2800,
    track: 'audio/emo-hyperpop.mp3',
    // Floaty, but not so floaty that the jump outruns the level. Airtime is
    // ~1.0 s and the speed is capped at 30, so a jump covers at most ~30 m
    // against 48 m between gaps. At the old 0.42 gravity and no speed cap it
    // was 57 m per jump, longer than a whole chunk, which is why it could not
    // be played.
    physics: { gravityScale: 0.58, jumpScale: 0.88, maxSpeed: 30, speedRamp: 0.16 },
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
      // A catwalk in vacuum with holes in it. No kerb, no deck, no ground.
      road: 'catwalk',
      obstacleKit: { barrier: 'crate', gate: 'beam', block: 'container' },
      arches: 'gantry', archEvery: 26, archTint: ['#7fd0ff', '#ffb02e'],
      lampEvery: 0, streetEvery: 0, billboardChance: 0.2,
      palmChance: 0, podChance: 0.7, stallChance: 0,
      skylineChance: 0.9, backRowChance: 0.5, waterSides: false, waterRoad: false,
      lotMin: 8, lotMax: 16, towerStacks: [2, 3], feature: 'gap',
      cargoChance: 0.8,
    },
  },

  {
    id: 'arcade',
    name: 'THE ARCADE',
    subtitle: 'YOU ARE THE BALL',
    mechanic: 'Chain the bumpers. Nothing else keeps the bar alive here.',
    built: true,
    length: 2200,
    track: 'audio/electronicore-finale.mp3',
    physics: { startSpeed: 22, maxSpeed: 46, speedRamp: 0.26 },
    sky: [
      [0.00, '#0a0320'], [0.28, '#2a0a55'], [0.5, '#6a12a0'],
      [0.68, '#c81ec8'], [0.84, '#ff4ad8'], [1.00, '#1a0533'],
    ],
    fog: { color: '#6a12a0', near: 150, far: 300 },
    sun: { color: '#ffd6ff', intensity: 1.5 },
    hemi: { sky: '#ff86ff', ground: '#14042a', intensity: 0.48 },
    backdrop: { sun: '#fff0ff', halo: '#ff2ee0', arc: '#a04ae0', planet: '#4a1080' },
    colors: {
      road: '#1c0a34',
      kerb: '#ffe14a',
      deck: '#2c0f52',
      edge: '#00e5ff',
      lane: '#ffe14a',
      accent: '#ff2ee0',
      accentGlow: '#ffe14a',
    },
    facades: ['#3a1060', '#52157a', '#2a0c4a', '#6a1a92', '#1f0940', '#45126a'],
    props: {
      road: 'street',
      walls: true,
      // Every block in the authored phrases becomes a bumper, and the bar
      // burns fast enough that ignoring them is not a strategy.
      bumpers: true,
      drain: 1.7,
      // Twice the usual gap between checkpoints: the bumper chain has to be
      // what bridges them, otherwise the RELAY does it for you.
      relayEvery: 6,
      obstacleKit: { barrier: 'fence', gate: 'gantry', block: 'pillar' },
      arches: 'round', archEvery: 12, archTint: ['#ff2ee0', '#00e5ff', '#ffe14a'],
      lampEvery: 9, streetEvery: 9, billboardChance: 1,
      palmChance: 0, podChance: 0.2, stallChance: 0.3,
      skylineChance: 0.9, backRowChance: 0.7, waterSides: false, waterRoad: false,
      lotMin: 5, lotMax: 11, towerStacks: [2, 4], feature: null,
    },
  },

  {
    id: 'heights',
    name: 'THE HEIGHTS',
    subtitle: 'ABOVE THE WEATHER',
    mechanic: 'The deck is missing. Be in a lane that still exists.',
    built: true,
    length: 3200,
    track: 'audio/the-heights.mp3',
    physics: {},
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
      // A bare bridge, narrower than a street, with nothing at the sides.
      // deckHalf and edgeX are a pair: the drop has to be where it looks.
      road: 'skybridge',
      deckHalf: 3.9,
      obstacleKit: { barrier: 'fence', gate: 'beam', block: 'pillar' },
      arches: 'none', archEvery: 0, archTint: ['#ff7ac6', '#ffffff'],
      lampEvery: 0, streetEvery: 0, billboardChance: 0,
      palmChance: 0, podChance: 0.2, stallChance: 0,
      skylineChance: 0.3, backRowChance: 0.2, waterSides: false, waterRoad: false,
      lotMin: 14, lotMax: 24, towerStacks: [3, 5], feature: 'hole',
      cloudChance: 1,
    },
  },

  {
    id: 'vault',
    name: 'THE VAULT',
    subtitle: 'SEALED TRANSIT TUBE',
    mechanic: 'You fly. Up and down pick an altitude, not a jump.',
    built: true,
    length: 2600,
    track: 'audio/neon-tears-in-the-void.mp3',
    physics: { startSpeed: 22, maxSpeed: 50, speedRamp: 0.3 },
    sky: [
      [0.00, '#0a0614'], [0.4, '#160c28'], [0.7, '#2a1450'], [1.00, '#08040f'],
    ],
    fog: { color: '#1a1030', near: 90, far: 210 },
    sun: { color: '#dcd0ff', intensity: 1.5 },
    hemi: { sky: '#b09fff', ground: '#0a0614', intensity: 0.4 },
    backdrop: { sun: '#1a1030', halo: '#1a1030', arc: '#1a1030', planet: '#120a22' },
    colors: {
      road: '#211538',
      kerb: '#8a7fc0',
      deck: '#2e1f4d',
      edge: '#8f6fff',
      lane: '#e8dcff',
      accent: '#c0a8ff',
      accentGlow: '#00e5ff',
    },
    facades: ['#2e1f4d', '#3a2560', '#241a44', '#422a6e', '#1e1436', '#352060'],
    props: {
      // A sealed tube: walls and a ceiling. With no sky and no skyline the
      // only thing left to read is the track, which changes everything.
      road: 'tube',
      obstacleKit: { barrier: 'slab', gate: 'pipe', block: 'container' },
      arches: 'none', archEvery: 0, archTint: ['#00e5ff', '#8f6fff'],
      lampEvery: 0, streetEvery: 0, billboardChance: 0,
      palmChance: 0, podChance: 0, stallChance: 0,
      skylineChance: 0, backRowChance: 0, waterSides: false, waterRoad: false,
      lotMin: 6, lotMax: 10, towerStacks: [1, 2], feature: null,
      // The whole zone is the mechanic: a 3x3 grid of lanes and altitudes.
      flight: true,
    },
  },

  {
    id: 'foundry',
    name: 'THE BOTTLING PLANT',
    subtitle: 'WHERE THE SODA IS MADE',
    mechanic: 'Belt lanes. Mint carries you, red syrup drags and drains you.',
    built: true,
    length: 2900,
    track: 'audio/sugar-crash-core.mp3',
    physics: { startSpeed: 20, maxSpeed: 46, speedRamp: 0.22 },
    // A rust-brown foundry was off-brief twice over: wrong palette and a
    // borrowed idea. It is the factory the drink is made in.
    sky: [
      [0.00, '#3a0f4a'], [0.28, '#8a1c72'], [0.5, '#e0348e'],
      [0.68, '#ff7ac6'], [0.84, '#ffd2ea'], [1.00, '#4a1258'],
    ],
    fog: { color: '#e0348e', near: 160, far: 310 },
    sun: { color: '#fff0f8', intensity: 2.0 },
    hemi: { sky: '#ffb0e0', ground: '#2a0c34', intensity: 0.5 },
    backdrop: { sun: '#fff6ff', halo: '#ff3f9e', arc: '#ffb0e0', planet: '#7a2090' },
    colors: {
      road: '#2e1240',
      kerb: '#fff0fa',
      deck: '#5a2470',
      edge: '#6ff0d4',
      lane: '#fffaf4',
      accent: '#ffd9ee',
      accentGlow: '#ff2e93',
    },
    facades: ['#ffd0ea', '#c9b6ff', '#a8ecda', '#ff9ed0', '#e8d8ff', '#fff0c8'],
    props: {
      road: 'street',
      walls: true,
      drain: 1.3,
      obstacleKit: { barrier: 'crate', gate: 'pipe', block: 'press' },
      arches: 'gantry', archEvery: 18, archTint: ['#ff2e93', '#6ff0d4'],
      lampEvery: 10, streetEvery: 8, billboardChance: 0.4,
      palmChance: 0, podChance: 0.25, stallChance: 0.2,
      skylineChance: 0.95, backRowChance: 0.8, waterSides: false, waterRoad: false,
      lotMin: 6, lotMax: 12, towerStacks: [2, 4], feature: 'belt',
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
    physics: { startSpeed: 25, maxSpeed: 54, speedRamp: 0.34 },
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
      road: 'street',
      walls: true,
      obstacleKit: { barrier: 'slab', gate: 'pipe', block: 'press' },
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
