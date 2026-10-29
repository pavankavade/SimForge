import type { EpisodeBeats, EpisodeConfig } from "./types";

/**
 * Static checks on an episode's config, run by defineEpisode and printed by
 * `npm run review` / `npm run audit` before a single still is rendered:
 * mistakes that otherwise only show up as a black frame (NaN camera), a
 * silent cue, or a render that dies at the audio mix after minutes.
 */
export interface EpisodeAudit {
  /** Problems found in the camera, SFX, beats and subtitles. */
  warnings: string[];
  /** Every static file the episode plays (relative to public/); review checks they exist. */
  assets: string[];
  /** The narration file; review checks it is not longer than the video. */
  narration?: string;
}

const finite = (v: unknown): v is number => typeof v === "number" && isFinite(v);
const finiteVec = (v: readonly number[]) => v.every(finite);

export const auditEpisode = (config: EpisodeConfig, beats?: EpisodeBeats): EpisodeAudit => {
  const warnings: string[] = [];
  const end = config.durationInFrames;
  const outside = (f: number) => f < 0 || f > end;
  const cam = config.camera;

  cam.waypoints.forEach((w, i) => {
    if (!finite(w.frame) || !finiteVec(w.position) || !finiteVec(w.lookAt)) {
      warnings.push(`camera waypoint #${i} (frame ${w.frame}) has a NaN: the frame renders black`);
    } else if (i > 0 && w.frame < cam.waypoints[i - 1].frame) {
      warnings.push(`camera waypoint #${i} (frame ${w.frame}) comes before #${i - 1} (frame ${cam.waypoints[i - 1].frame}): keep waypoints in frame order (clamp beats that can cross)`);
    }
  });
  (cam.tracks ?? []).forEach((t, i) => {
    if (!finite(t.start) || !finite(t.end) || t.end <= t.start) {
      warnings.push(`camera track #${i} runs ${t.start}-${t.end}: it never shows`);
      return;
    }
    for (const f of [t.start, Math.round((t.start + t.end) / 2), t.end]) {
      const p = t.fn(f);
      if (!finiteVec(p.position) || !finiteVec(p.lookAt)) {
        warnings.push(`camera track #${i} (${t.start}-${t.end}) returns NaN at frame ${f}`);
        break;
      }
    }
  });
  (cam.shake ?? []).forEach((s, i) => {
    if (!finite(s.at) || !finite(s.strength)) warnings.push(`camera shake #${i} has a NaN`);
    else if (s.strength > 0.6) warnings.push(`camera shake at ${s.at} has strength ${s.strength} (impacts use 0.1-0.36)`);
  });

  const cued = new Set<string>();
  (config.sfx ?? []).forEach((c) => {
    if (!finite(c.frame)) {
      warnings.push(`sfx ${c.src} has a NaN frame`);
      return;
    }
    if (outside(c.frame)) warnings.push(`sfx ${c.src} at frame ${c.frame} is outside the video (0-${end})`);
    if ((c.volume ?? 1) > 1) warnings.push(`sfx ${c.src} at ${c.frame} has volume ${c.volume} (above 1 clips: mix it in the audio script)`);
    if (c.durationInFrames !== undefined && !(c.durationInFrames > 0)) warnings.push(`sfx ${c.src} at ${c.frame} has durationInFrames ${c.durationInFrames}`);
    const key = `${c.src}@${c.frame}`;
    if (cued.has(key)) warnings.push(`sfx ${c.src} is cued twice on frame ${c.frame} (doubles its volume)`);
    cued.add(key);
  });

  if (beats) {
    for (const name of Object.keys(beats)) {
      const v = beats[name];
      const list: readonly number[] = typeof v === "number" ? [v] : v;
      list.forEach((f, j) => {
        const tag = list.length > 1 ? `${name}[${j}]` : name;
        if (!finite(f)) warnings.push(`beat ${tag} is NaN`);
        else if (outside(f)) warnings.push(`beat ${tag} at frame ${f} is outside the video (0-${end})`);
      });
    }
  }

  const segments = config.subtitles?.segments ?? [];
  const last = segments.length ? segments[segments.length - 1] : null;
  if (last && last.endFrame > end) warnings.push(`subtitles run to frame ${last.endFrame}, past the end of the video (${end})`);

  const assets = [config.audio?.src, config.music?.src].concat((config.sfx ?? []).map((c) => c.src));
  const unique: string[] = [];
  assets.forEach((a) => {
    if (a && unique.indexOf(a) < 0) unique.push(a);
  });
  return { warnings, assets: unique, narration: config.audio?.src };
};
