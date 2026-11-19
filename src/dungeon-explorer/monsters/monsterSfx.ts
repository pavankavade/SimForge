// Monster sounds, synthesised (Web Audio, no files): the bow's twang and the arrow's thock in stone,
// a mage's bolt gathering and bursting, bone struck and a skeleton clattering down, a slime's
// squelch, its landing, its burst, and acid hissing. Browsers start audio only after a gesture, so
// call `unlock()` from a click or key press.
export interface MonsterSfx {
  unlock: () => void;
  twang: () => void;
  thock: () => void;
  cast: () => void;
  burst: () => void;
  boneHit: () => void;
  collapse: () => void;
  squelch: (big?: number) => void;
  plop: (big?: number) => void;
  sizzle: () => void;
  /** Traps (traps.ts): a spike plate's mechanism catching, its spikes shooting up, a log's blow. */
  trapClick: () => void;
  spikes: () => void;
  thud: () => void;
  /** A swinging blade sweeping past. */
  swish: () => void;
  dispose: () => void;
}

export function createMonsterSfx(volume = 0.45): MonsterSfx {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;

  const unlock = () => {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noise.getChannelData(0);
      let seed = 777;
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        data[i] = (seed >>> 0) / 2147483648 - 1;
      }
    }
    if (ctx.state === "suspended") void ctx.resume();
  };
  const live = () => !!ctx && !!master && ctx.state === "running";

  /** Filtered noise with an attack/decay envelope, starting `at` seconds from now. */
  const hiss = (type: BiquadFilterType, f0: number, f1: number, q: number, gain: number, attack: number, decay: number, at = 0) => {
    if (!live() || !ctx || !master || !noise) return;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + attack + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    src.connect(f).connect(g).connect(master);
    src.start(t, (t * 3.7) % 0.8);
    src.stop(t + attack + decay + 0.05);
  };
  /** A tone gliding f0 → f1. */
  const tone = (f0: number, f1: number, gain: number, attack: number, decay: number, type: OscillatorType = "sine", at = 0) => {
    if (!live() || !ctx || !master) return;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + attack + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
  };

  return {
    unlock,
    twang() {
      tone(180, 120, 0.22, 0.004, 0.22, "triangle");
      tone(360, 250, 0.08, 0.004, 0.12, "sawtooth");
      hiss("bandpass", 2400, 900, 2, 0.12, 0.004, 0.18);
    },
    thock() {
      hiss("bandpass", 1500, 500, 3, 0.25, 0.002, 0.06);
      tone(240, 140, 0.12, 0.002, 0.08, "triangle");
    },
    cast() {
      tone(220, 660, 0.09, 0.25, 0.45, "sine");
      tone(330, 990, 0.05, 0.25, 0.4, "triangle");
      hiss("bandpass", 600, 3200, 4, 0.08, 0.3, 0.35);
    },
    burst() {
      hiss("lowpass", 3000, 200, 0.7, 0.3, 0.005, 0.35);
      tone(520, 90, 0.14, 0.004, 0.3, "sine");
    },
    boneHit() {
      hiss("bandpass", 2600, 1200, 5, 0.28, 0.002, 0.07);
      tone(900, 600, 0.08, 0.002, 0.06, "square");
      hiss("bandpass", 1800, 900, 6, 0.12, 0.002, 0.05, 0.035);
    },
    collapse() {
      for (let i = 0; i < 9; i++) {
        const at = 0.06 * i + (i % 3) * 0.025;
        hiss("bandpass", 2200 - i * 120, 900, 5, 0.2 - i * 0.012, 0.002, 0.06, at);
      }
      hiss("lowpass", 500, 80, 0.8, 0.22, 0.01, 0.3, 0.12);
    },
    squelch(big = 1) {
      hiss("lowpass", 900 / big, 160, 3, 0.26, 0.01, 0.16 * big);
      tone(170 / big, 70 / big, 0.14, 0.01, 0.14 * big, "sine");
    },
    plop(big = 1) {
      tone(130 / big, 55 / big, 0.1, 0.006, 0.12 * big, "sine");
      hiss("lowpass", 500, 120, 1.5, 0.05, 0.005, 0.08);
    },
    sizzle() {
      hiss("highpass", 3000, 5000, 0.8, 0.07, 0.02, 0.4);
    },
    trapClick() {
      // Two dry ratchet clicks.
      hiss("bandpass", 3200, 2200, 8, 0.16, 0.001, 0.03);
      tone(1400, 900, 0.05, 0.001, 0.03, "square");
      hiss("bandpass", 2800, 1900, 8, 0.13, 0.001, 0.03, 0.09);
    },
    spikes() {
      // Steel sliding out fast: a bright scrape over a low knock.
      hiss("highpass", 2500, 6000, 1.2, 0.2, 0.004, 0.16);
      tone(2600, 1700, 0.05, 0.002, 0.14, "sawtooth");
      tone(160, 70, 0.14, 0.002, 0.1, "sine");
    },
    thud() {
      hiss("lowpass", 700, 120, 1.2, 0.3, 0.003, 0.18);
      tone(110, 55, 0.18, 0.003, 0.16, "sine");
    },
    swish() {
      // Air torn by a heavy blade: a band of noise sweeping up then down, and a faint ring.
      hiss("bandpass", 500, 1800, 2.5, 0.16, 0.12, 0.18);
      tone(1900, 1700, 0.015, 0.05, 0.3, "sine");
    },
    dispose() {
      void ctx?.close();
      ctx = null;
    },
  };
}
