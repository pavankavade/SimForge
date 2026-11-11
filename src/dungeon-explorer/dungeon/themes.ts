// Adapted from Realistic Procedural Dungeons (MIT License: blendi-bylygbashi, Patch, Majid Manzarpour).

export interface ThemePoolConfig {
  mode: number;
  colA: number;
  colB: number;
  glow: number;
  light?: number;
}

export interface ThemeLightConfig {
  color: number;
  i: number;
  r: number;
}

export interface ThemeConfig {
  label: string;
  accent: string;
  bg: number;
  fog: number;
  fogD: number;
  walkFog: number;
  walkFogD?: number;
  hemi: [number, number, number];
  dir: [number, number];
  floor: number;
  corridor: number;
  wall: number;
  cap: number;
  pillar: number;
  debris: [number, number];
  vaults?: boolean;
  flame: number;
  flameCore: number;
  torchLight: [number, number, number];
  candleLight?: ThemeLightConfig;
  emberLight?: ThemeLightConfig;
  doorLight?: ThemeLightConfig;
  lampR?: number;
  coldFill?: { color: number; i: number };
  carried?: number;
  cloth: number;
  pools: ThemePoolConfig | null;
  shafts?: boolean;
  particles: { kind: number; color: number; n: number };
}

export type ThemeName = "ancient" | "molten" | "frost" | "grim" | "verdant";

export const THEMES: Record<ThemeName, ThemeConfig> = {
  ancient: {
    label: "Ancient",
    accent: "#e8973f",
    bg: 0x07080d,
    fog: 0x07080d,
    fogD: 0.0021,
    walkFog: 0x0d0c0e,
    hemi: [0x2e3a52, 0x0a0b10, 0.55],
    dir: [0xffe8c8, 0.85],
    floor: 0x8a8f9c,
    corridor: 0x6d7380,
    wall: 0x5c626e,
    cap: 0x757b88,
    pillar: 0x6a707e,
    debris: [0x4c515e, 0x60584a],
    vaults: true,
    flame: 0xffa640,
    flameCore: 0xfff3c8,
    torchLight: [0xff8c3a, 1.5, 9.5],
    candleLight: { color: 0xffe4b8, i: 0.5, r: 5 },
    emberLight: { color: 0xff9a44, i: 1.4, r: 4 },
    doorLight: { color: 0xffdfa8, i: 0.42, r: 4.5 },
    lampR: 7.5,
    coldFill: { color: 0x7e8ea8, i: 0.22 },
    carried: 0.14,
    cloth: 0x7d2c26,
    pools: null,
    particles: { kind: 0, color: 0xaab4cc, n: 110 },
  },
  molten: {
    label: "Molten",
    accent: "#ff8642",
    bg: 0x0c0605,
    fog: 0x1a0b04,
    fogD: 0.0028,
    walkFog: 0x1a0a04,
    hemi: [0x6b3419, 0x160503, 0.55],
    dir: [0xffd9b0, 0.5],
    floor: 0x7a685c,
    corridor: 0x614f44,
    wall: 0x503e34,
    cap: 0x6b5546,
    pillar: 0x5e4a3e,
    debris: [0x4a382e, 0x60462f],
    vaults: true,
    flame: 0xff8c26,
    flameCore: 0xffe9b0,
    torchLight: [0xff7326, 1.7, 10],
    candleLight: { color: 0xffb870, i: 0.5, r: 4.8 },
    emberLight: { color: 0xff7b28, i: 1.6, r: 4.2 },
    doorLight: { color: 0xffaa66, i: 0.4, r: 4.2 },
    lampR: 7,
    coldFill: { color: 0x805040, i: 0.2 },
    carried: 0.12,
    cloth: 0x7d2416,
    pools: { mode: 0, colA: 0x2b0d05, colB: 0xff5a1f, glow: 1.55, light: 0xff5a1f },
    particles: { kind: 1, color: 0xffa050, n: 240 },
  },
  frost: {
    label: "Frost",
    accent: "#7fd4ff",
    bg: 0x060a12,
    fog: 0x0b1522,
    fogD: 0.0024,
    walkFog: 0x0c1826,
    hemi: [0x3a5a80, 0x0a0e18, 0.5],
    dir: [0xcfe4ff, 0.82],
    floor: 0x93a0b2,
    corridor: 0x78848f,
    wall: 0x60708a,
    cap: 0x8194ac,
    pillar: 0x70809a,
    debris: [0x55617a, 0x6d7a90],
    vaults: true,
    flame: 0x86d9ff,
    flameCore: 0xe8f7ff,
    torchLight: [0x6fc4ff, 1.35, 9.5],
    candleLight: { color: 0xb6e6ff, i: 0.45, r: 4.8 },
    emberLight: { color: 0x8ad8ff, i: 1.3, r: 3.6 },
    doorLight: { color: 0xa4dcff, i: 0.36, r: 4.2 },
    lampR: 7,
    coldFill: { color: 0x7fa8d0, i: 0.24 },
    carried: 0.12,
    cloth: 0x2b4d70,
    pools: { mode: 1, colA: 0x4a86c0, colB: 0xbfe4ff, glow: 0.55 },
    particles: { kind: 2, color: 0xdff0ff, n: 260 },
  },
  grim: {
    label: "Grim",
    accent: "#9fe66a",
    bg: 0x070a07,
    fog: 0x0a130a,
    fogD: 0.003,
    walkFog: 0x0a140a,
    hemi: [0x2c4030, 0x070a06, 0.52],
    dir: [0xbfd8b0, 0.45],
    floor: 0x7c8276,
    corridor: 0x62685c,
    wall: 0x4f5549,
    cap: 0x666c5e,
    pillar: 0x5c6254,
    debris: [0x4a4f44, 0x5e5c48],
    vaults: true,
    flame: 0x8fe05a,
    flameCore: 0xe9ffd0,
    torchLight: [0x77d94a, 1.35, 9],
    candleLight: { color: 0xc2e6a4, i: 0.44, r: 4.5 },
    emberLight: { color: 0x99e060, i: 1.3, r: 3.6 },
    doorLight: { color: 0xb0d698, i: 0.35, r: 4 },
    lampR: 6.5,
    coldFill: { color: 0x7a8a78, i: 0.2 },
    carried: 0.12,
    cloth: 0x33461f,
    pools: { mode: 3, colA: 0x0a1207, colB: 0x41602c, glow: 0.6, light: 0x41802c },
    particles: { kind: 3, color: 0x9fe66a, n: 150 },
  },
  verdant: {
    label: "Verdant",
    accent: "#59d68f",
    bg: 0x060c09,
    fog: 0x091510,
    fogD: 0.0023,
    walkFog: 0x040605,
    walkFogD: 0.032,
    hemi: [0x3e4a4e, 0x090b0b, 0.06],
    dir: [0xd8f0c8, 0.8],
    floor: 0x85837e,
    corridor: 0x706f6c,
    wall: 0x77787a,
    cap: 0x6e7a66,
    pillar: 0x6c6d70,
    debris: [0x4d4c4a, 0x5b5850],
    vaults: true,
    flame: 0xd6dfe6,
    flameCore: 0xffffff,
    torchLight: [0xc8d6f2, 1.2, 9],
    candleLight: { color: 0xd9dcd2, i: 0.42, r: 4.5 },
    emberLight: { color: 0xffa050, i: 1.3, r: 3.2 },
    doorLight: { color: 0xc4c8bc, i: 0.34, r: 4 },
    lampR: 6.5,
    coldFill: { color: 0x93a3a6, i: 0.2 },
    carried: 0.08,
    cloth: 0x4a2a24,
    pools: { mode: 2, colA: 0x0c3532, colB: 0x2fa38a, glow: 0.6, light: 0x2fa38a },
    shafts: true,
    particles: { kind: 4, color: 0xb8b09c, n: 200 },
  },
};

export const ROLE_TINT: Record<string, number> = {
  entrance: 0x3fd0bb,
  combat: 0x8f95a3,
  elite: 0x9b6cf0,
  treasure: 0xd9a441,
  shrine: 0x5a8fe8,
  boss: 0xd8433a,
};
