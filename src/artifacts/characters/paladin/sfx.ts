// Synthesised combat sounds (Web Audio, no files): the cut through the air, steel on stone, the
// blow landing, and armoured footfalls. Browsers only allow audio after a user gesture, so call
// `unlock()` from a click or key press.
export interface PaladinSfx {
  unlock: () => void;
  swing: (index: number) => void;
  clang: () => void;
  hit: () => void;
  step: (running: number) => void;
  dispose: () => void;
}

export function createPaladinSfx(volume = 0.5): PaladinSfx {
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
      let seed = 12345;
      for (let i = 0; i < data.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        data[i] = (seed >>> 0) / 2147483648 - 1;
      }
    }
    if (ctx.state === "suspended") void ctx.resume();
  };

  /** A burst of filtered noise with an attack/decay envelope. */
  const burst = (type: BiquadFilterType, f0: number, f1: number, q: number, gain: number, attack: number, decay: number) => {
    if (!ctx || !master || !noise || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(f0, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + attack + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    src.connect(filter).connect(g).connect(master);
    src.start(t, (t * 7.3) % 0.8);
    src.stop(t + attack + decay + 0.05);
  };

  const tone = (freq: number, f1: number, gain: number, decay: number, type: OscillatorType = "sine") => {
    if (!ctx || !master || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  };

  return {
    unlock,
    swing(index: number) {
      // The overhead chop is heavier and lower than the two cuts.
      const low = index === 2;
      burst("bandpass", low ? 420 : 620, low ? 1500 : 2100, 1.4, 0.5, 0.09, 0.16);
      burst("highpass", 2500, 5000, 0.5, 0.08, 0.07, 0.12);
    },
    clang() {
      for (const [f, g, d] of [
        [587, 0.22, 0.55],
        [1331, 0.2, 0.42],
        [2093, 0.16, 0.34],
        [2967, 0.12, 0.26],
        [4186, 0.08, 0.18],
      ]) {
        tone(f, f * 0.992, g, d);
      }
      burst("highpass", 3000, 6000, 0.7, 0.5, 0.002, 0.07);
    },
    hit() {
      tone(130, 48, 0.7, 0.18);
      burst("lowpass", 900, 200, 0.8, 0.6, 0.004, 0.13);
      tone(1760, 1700, 0.06, 0.12);
    },
    step(running: number) {
      burst("lowpass", 260 + running * 120, 90, 0.9, 0.16 + running * 0.14, 0.004, 0.09);
      // Plates settling.
      burst("bandpass", 3400, 2600, 6, 0.035 + running * 0.03, 0.003, 0.05);
    },
    dispose() {
      if (ctx) void ctx.close();
      ctx = null;
    },
  };
}
