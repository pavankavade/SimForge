// The spells' sounds: recorded takes from the AI sound model (scripts/gen-sfx.py with
// scripts/sfx-prompts/explorer-spells.json; the picks are in public/dungeon-explorer/explorer-spells/
// sfx_ai/ as mp3). Nothing here is synthesised: a sound whose file is missing stays silent.
// Loaded once the first gesture unlocks audio; a cast's charge-up hum plays until the spell leaves.

export type SpellSound =
  | "cast_charge"
  | "zap"
  | "missile"
  | "missile_hit"
  | "ice_bolt"
  | "ice_hit"
  | "fireball"
  | "fire_boom"
  | "haste"
  | "shield"
  | "focus"
  | "heal"
  | "holy_light"
  | "bless"
  | "sanctuary"
  | "smite"
  | "rest_charge";

const SOUNDS: SpellSound[] = [
  "cast_charge",
  "zap",
  "missile",
  "missile_hit",
  "ice_bolt",
  "ice_hit",
  "fireball",
  "fire_boom",
  "haste",
  "shield",
  "focus",
  "heal",
  "holy_light",
  "bless",
  "sanctuary",
  "smite",
  "rest_charge",
];
const BASE = "explorer-spells/sfx_ai/";

export interface SpellSfx {
  unlock: () => void;
  /** One sound (gain 0..1; rate shifts its pitch a little for variety). */
  play: (name: SpellSound, gain?: number, rate?: number) => void;
  /** The charge-up hum while a spell is cast (one at a time), and its end. */
  charge: (gain?: number) => void;
  stopCharge: () => void;
  dispose: () => void;
}

export function createSpellSfx(volume = 0.6): SpellSfx {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  const buffers = new Map<SpellSound, AudioBuffer>();
  let charging: { src: AudioBufferSourceNode; g: GainNode } | null = null;

  const load = (c: AudioContext) => {
    for (const name of SOUNDS) {
      fetch(BASE + name + ".mp3")
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then((b) => c.decodeAudioData(b))
        .then((buf) => buffers.set(name, buf))
        .catch(() => {
          // Not picked yet: that spell is silent.
        });
    }
  };

  const start = (name: SpellSound, gain: number, rate: number) => {
    const buf = buffers.get(name);
    if (!ctx || !master || !buf) return null;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(master);
    src.start();
    return { src, g };
  };

  return {
    unlock() {
      if (!ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
        load(ctx);
      }
      if (ctx.state === "suspended") void ctx.resume();
    },
    play(name, gain = 1, rate = 1) {
      start(name, gain, rate);
    },
    charge(gain = 0.55) {
      this.stopCharge();
      charging = start("cast_charge", gain, 1);
    },
    stopCharge() {
      if (!charging || !ctx) return;
      const { src, g } = charging;
      charging = null;
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.08);
      src.stop(t + 0.1);
    },
    dispose() {
      charging = null;
      void ctx?.close();
      ctx = null;
    },
  };
}
