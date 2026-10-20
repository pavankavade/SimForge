import type { EnvironmentConfig } from "./types";

export const ENVIRONMENT_PRESETS = {
  ancientBattlefield: {
    sky: {
      top: "#4b8fdd",
      mid: "#93c8f5",
      bottom: "#dceefb",
    },
    fog: {
      color: "#b6d4f5",
      near: 55,
      far: 160,
    },
    ground: {
      color: "#c2aa87",
      texture: {
        base: "#baa280",
        patchA: "rgba(168, 144, 110, 0.35)",
        patchB: "rgba(215, 192, 156, 0.35)",
        crack: "rgba(135, 112, 82, 0.45)",
        repeat: [10, 10],
        patches: 400,
        cracks: 60,
      },
    },
    hills: [
      { position: [-50, 12, -55], scale: [24, 28, 24], color: "#3f633f" },
      { position: [-25, 15.5, -65], scale: [30, 35, 30], color: "#345834" },
      { position: [0, 18, -70], scale: [35, 40, 35], color: "#2a4a2c" },
      { position: [30, 14, -60], scale: [28, 32, 28], color: "#3d613d" },
      { position: [55, 10.5, -50], scale: [22, 25, 22], color: "#486b46" },
      { position: [-70, 9, -45], scale: [20, 22, 20], color: "#3a5c3a" },
      { position: [70, 9, -45], scale: [20, 22, 20], color: "#345734" },
    ],
    clouds: [
      { position: [-48, 47, -98], size: 7.5, opacity: 0.78 },
      { position: [-8, 53, -110], size: 6.2, opacity: 0.7 },
      { position: [34, 45, -96], size: 8.6, opacity: 0.74 },
      { position: [68, 55, -112], size: 5.4, opacity: 0.62 },
      { position: [-82, 57, -108], size: 5.8, opacity: 0.58 },
    ],
    lights: {
      key: { position: [22, 32, 26], intensity: 2.8, color: "#fff8ec" },
      fill: { position: [-18, 22, 22], intensity: 1.8, color: "#dce9fc" },
      rim: { position: [0, 16, 35], intensity: 1.4, color: "#fffef8" },
      ambient: { intensity: 1.5, color: "#eef4ff" },
      shadows: true,
    },
  },
  sunset: {
    sky: {
      top: "#31406f",
      mid: "#e9825f",
      bottom: "#ffd5a6",
    },
    fog: {
      color: "#f2b98f",
      near: 45,
      far: 150,
    },
    ground: {
      color: "#c49b72",
      texture: {
        base: "#c49b72",
        patchA: "rgba(146, 95, 62, 0.3)",
        patchB: "rgba(238, 191, 137, 0.3)",
        crack: "rgba(112, 72, 48, 0.4)",
        repeat: [9, 9],
        patches: 320,
        cracks: 45,
      },
    },
    hills: [
      { position: [-52, 10, -58], scale: [28, 24, 28], color: "#6d4a5f" },
      { position: [-18, 12, -68], scale: [34, 28, 34], color: "#5a3f56" },
      { position: [22, 14, -66], scale: [30, 32, 30], color: "#4b3b52" },
      { position: [58, 9, -52], scale: [24, 22, 24], color: "#71495c" },
    ],
    clouds: [
      { position: [-44, 36, -92], size: 8.4, opacity: 0.5 },
      { position: [8, 44, -104], size: 7.1, opacity: 0.42 },
      { position: [50, 38, -96], size: 9.2, opacity: 0.48 },
    ],
    lights: {
      key: { position: [26, 22, 18], intensity: 3.1, color: "#ffd0a0" },
      fill: { position: [-20, 16, 20], intensity: 1.4, color: "#b9c6ff" },
      rim: { position: [0, 10, 30], intensity: 1.2, color: "#ffb27a" },
      ambient: { intensity: 1.2, color: "#ffe3cc" },
      shadows: true,
    },
  },
  night: {
    sky: {
      top: "#050b18",
      mid: "#12233f",
      bottom: "#2d4566",
    },
    fog: {
      color: "#203451",
      near: 40,
      far: 135,
    },
    ground: {
      color: "#5b6170",
      texture: {
        base: "#4f5562",
        patchA: "rgba(35, 42, 54, 0.35)",
        patchB: "rgba(105, 115, 132, 0.3)",
        crack: "rgba(20, 25, 34, 0.5)",
        repeat: [9, 9],
        patches: 280,
        cracks: 40,
      },
    },
    hills: [
      { position: [-50, 8, -60], scale: [30, 22, 30], color: "#0e1b2a" },
      { position: [-8, 10, -70], scale: [36, 28, 36], color: "#101f31" },
      { position: [38, 9, -62], scale: [28, 24, 28], color: "#0c1826" },
    ],
    clouds: [
      { position: [-30, 42, -100], size: 8.6, opacity: 0.18 },
      { position: [28, 48, -108], size: 9.4, opacity: 0.14 },
    ],
    lights: {
      key: { position: [18, 30, 20], intensity: 1.4, color: "#89a7ff" },
      fill: { position: [-22, 18, 18], intensity: 0.8, color: "#4a6aa8" },
      rim: { position: [0, 14, 30], intensity: 0.7, color: "#9ec1ff" },
      ambient: { intensity: 0.55, color: "#7f95c4" },
      shadows: true,
    },
  },
  dungeonVault: {
    sky: {
      top: "#08090d",
      mid: "#11131a",
      bottom: "#161924",
    },
    fog: {
      color: "#12141c",
      near: 16,
      far: 48,
    },
    ground: {
      color: "#161720",
      texture: null,
    },
    hills: [],
    clouds: [],
    lights: {
      key: { position: [6, 12, 10], intensity: 2.2, color: "#ffe0a8" },
      fill: { position: [-8, 8, 8], intensity: 1.0, color: "#7a95bd" },
      rim: { position: [0, 14, -8], intensity: 1.2, color: "#adc4eb" },
      ambient: { intensity: 0.65, color: "#283042" },
      shadows: true,
    },
  },
} satisfies Record<string, EnvironmentConfig>;
