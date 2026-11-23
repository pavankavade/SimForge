export interface WeaponSpec {
  name: string;
  category: "pistol" | "smg" | "rifle" | "sniper" | "knife";
  damage: number;
  headshotMultiplier: number;
  fireRate: number; // shots per second
  magSize: number;
  reloadTime: number; // seconds
  recoil: number;
  isAutomatic: boolean;
  modelColor: string;
}

export const GUN_GAME_LEVELS: WeaponSpec[] = [
  {
    name: "Glock-18",
    category: "pistol",
    damage: 26,
    headshotMultiplier: 2.2,
    fireRate: 4.5,
    magSize: 20,
    reloadTime: 1.4,
    recoil: 0.03,
    isAutomatic: false,
    modelColor: "#22252a",
  },
  {
    name: "MP5-SD",
    category: "smg",
    damage: 24,
    headshotMultiplier: 2.0,
    fireRate: 9.5,
    magSize: 30,
    reloadTime: 1.8,
    recoil: 0.045,
    isAutomatic: true,
    modelColor: "#333842",
  },
  {
    name: "AK-47",
    category: "rifle",
    damage: 42,
    headshotMultiplier: 2.5,
    fireRate: 7.0,
    magSize: 30,
    reloadTime: 2.1,
    recoil: 0.065,
    isAutomatic: true,
    modelColor: "#613b1e", // wood finish
  },
  {
    name: "AWP",
    category: "sniper",
    damage: 110,
    headshotMultiplier: 2.5,
    fireRate: 1.1,
    magSize: 5,
    reloadTime: 2.6,
    recoil: 0.12,
    isAutomatic: false,
    modelColor: "#3c4d37", // olive drab
  },
  {
    name: "Golden Knife",
    category: "knife",
    damage: 150,
    headshotMultiplier: 1.0,
    fireRate: 1.8,
    magSize: 1,
    reloadTime: 0.1,
    recoil: 0.02,
    isAutomatic: false,
    modelColor: "#ffd700", // gold
  },
];
