// The merchants of the market street and what they deal in. The armourer and the weaponsmith sell
// the fighter's own kit, the cleric's mace and the ranger's leathers (a new piece each time), the
// woodsmith bows and arrows, the alchemist draughts, bandages and food for the belt, the arcanist the
// wizard's staff and cloth. For now every one of them buys whatever he brings up from the dungeon.
import { ARMOR_SLOTS, type ArmorSlot } from "../artifacts/characters/paladin";
import { CLOTH_IDS, LEATHER_IDS, def, itemOf, type ItemInst } from "./items";

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
    stock: (ARMOUR as string[]).concat(LEATHER_IDS.map(([id]) => id)),
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
    stock: ["sword", "flanged_mace", "shield", "short_bow", "recurve_bow", "long_bow", "arrows"],
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
    stock: ["oak_staff"].concat(CLOTH_IDS.map(([id]) => id)),
    greeting: "Ah. A customer who can feel the ley lines. Staves, robes, and nothing that explodes on the shelf.",
    empty: "Nothing I could sell you would survive the trip down. Not yet.",
  },
  {
    id: "woodsmith",
    name: "Oswin Fell",
    trade: "Woodsmith",
    shop: "Fell's Bows & Hafts",
    cloth: 0x7a5426,
    trim: 0xe6c48a,
    stock: ["short_bow", "recurve_bow", "long_bow", "arrows"],
    greeting: "Ash for hafts, yew for bows.",
    empty: "Still seasoning the timber. Nothing ready to sell yet.",
  },
];

/** A hex colour as CSS (`#rrggbb`). */
export const css = (hex: number) => `#${("000000" + hex.toString(16)).slice(-6)}`;

/** What a merchant asks for an item (gold). */
export const priceOf = (id: string): number => def(id).value * buyQty(id);

/** How many come in one purchase: arrows by the stack, everything else one at a time. */
export const buyQty = (id: string): number => {
  const d = def(id);
  return d.category === "ammo" ? (d.stack ?? 1) : 1;
};

/** What a merchant pays for it (two fifths of its value, at its own rarity). */
export const sellPriceOf = (item: ItemInst): number => Math.max(1, Math.round(itemOf(item).value * 0.4)) * (item.qty ?? 1);

/** Every merchant buys whatever he brings up (for now): only coins are not for sale. */
export const buysItem = (_m: Merchant, id: string): boolean => def(id).category !== "coins";
