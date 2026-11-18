// The merchants of the entrance market and what they deal in. The armourer and the weaponsmith sell
// the paladin's own kit (a new piece each time) and buy what he finds below (pieces of armour,
// weapons, trophies and valuables); the alchemist sells draughts, bandages and food for the belt;
// the arcanist and the woodsmith have nothing yet.
import { ARMOR_SLOTS, type ArmorSlot } from "../artifacts/characters/paladin";
import { def, type ItemCategory } from "./items";

export type MerchantId = "armourer" | "weaponsmith" | "alchemist" | "mage" | "woodsmith";

export interface Merchant {
  id: MerchantId;
  /** The merchant's own name and their trade. */
  name: string;
  trade: string;
  /** The sign over the stall. */
  shop: string;
  /** Awning cloth and trim (hex). */
  cloth: number;
  trim: number;
  /** What they sell (item ids); empty for now for the others. */
  stock: string[];
  /** What they buy from him. */
  buys: ItemCategory[];
  greeting: string;
  /** What they say with nothing to sell. */
  empty: string;
}

const ARMOUR: ArmorSlot[] = ARMOR_SLOTS.filter((s) => s !== "sword" && s !== "shield");

/** Stall order: the two with stock first, so a cramped hall still has them. */
export const MERCHANTS: Merchant[] = [
  {
    id: "armourer",
    name: "Godric Holt",
    trade: "Armourer",
    shop: "Holt's Plate & Mail",
    cloth: 0x6b1f1a,
    trim: 0xd9b25a,
    stock: ARMOUR,
    buys: ["armor", "valuable"],
    greeting: "Plate, mail and padding, all fitted to a man your size.",
    empty: "",
  },
  {
    id: "weaponsmith",
    name: "Dagan Voss",
    trade: "Weaponsmith",
    shop: "The Tempered Edge",
    cloth: 0x2a3440,
    trim: 0xc8ccd2,
    stock: ["sword", "shield"],
    buys: ["weapon", "trophy", "valuable"],
    greeting: "Steel that holds an edge. Oak that holds a line.",
    empty: "",
  },
  {
    id: "alchemist",
    name: "Ambrose Marrow",
    trade: "Alchemist",
    shop: "Marrow's Tinctures",
    cloth: 0x2e5a34,
    trim: 0xb7d36a,
    stock: ["potion", "bandage", "apple"],
    buys: ["consumable"],
    greeting: "Mind the green ones. The red ones mend you; the linen stops the bleeding.",
    empty: "My shelves are bare until the next caravan. Come back later.",
  },
  {
    id: "mage",
    name: "Aurelian the Grey",
    trade: "Arcanist",
    shop: "Wards & Wonders",
    cloth: 0x3a2a66,
    trim: 0x9ad0ff,
    stock: [],
    buys: [],
    greeting: "Ah. A customer who can't feel the ley lines. How quaint.",
    empty: "Nothing I could sell you would survive the trip down. Not yet.",
  },
  {
    id: "woodsmith",
    name: "Oswin Fell",
    trade: "Woodsmith",
    shop: "Fell's Bows & Hafts",
    cloth: 0x7a5426,
    trim: 0xe6c48a,
    stock: [],
    buys: [],
    greeting: "Ash for hafts, yew for bows.",
    empty: "Still seasoning the timber. Nothing ready to sell yet.",
  },
];

/** A hex colour as CSS (`#rrggbb`). */
export const css = (hex: number) => `#${("000000" + hex.toString(16)).slice(-6)}`;

/** What a merchant asks for an item (gold). */
export const priceOf = (id: string): number => def(id).value;

/** What a merchant pays for one (two fifths of its value). */
export const sellPriceOf = (id: string, qty = 1): number => Math.max(1, Math.round(def(id).value * 0.4)) * qty;

export const buysItem = (m: Merchant, id: string): boolean => m.buys.indexOf(def(id).category) >= 0;
