// The film's cast: realistic WW1 soldiers (soldier.js) driven by the narration-keyed tracks in
// anim.js. The tracks are the episode kit's Actor format, and easedPose (src/kit/actors) blends
// every pose switch and facing snap exactly as ActorView would for the toy cast.
import { easedPose } from "../../../src/kit/actors";
import { buildSoldier, LOOKS } from "./soldier.js";
import { TRACKS } from "./anim.js";

// Returns pose(frame): places and poses every character at that frame.
export async function mountFilm({ scene }) {
  const cast = TRACKS.map(({ id, classType, track }) => {
    const s = buildSoldier(LOOKS[classType]);
    s.root.name = id;
    scene.add(s.root);
    return { s, track };
  });
  return (frame) => {
    for (const { s, track } of cast) {
      const p = easedPose(track, frame);
      s.root.visible = !!p;
      if (p) s.set(p.actor, p.rig, p.yaw);
    }
  };
}
