import type React from "react";
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import type { SfxCue } from "./types";

interface SfxTrackProps {
  cues: SfxCue[];
}

export const SfxTrack: React.FC<SfxTrackProps> = ({ cues }) => (
  <>
    {cues.map((cue, index) => {
      const volume = cue.volume ?? 1;
      const fade = cue.fadeOutFrames ?? 0;
      const duration = cue.durationInFrames;
      return (
        <Sequence
          key={`${cue.src}-${cue.frame}-${index}`}
          from={cue.frame}
          durationInFrames={duration}
          layout="none"
        >
          <Audio
            src={staticFile(cue.src)}
            volume={
              duration !== undefined && fade > 0
                ? (f) =>
                    interpolate(f, [duration - fade, duration], [volume, 0], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    })
                : volume
            }
          />
        </Sequence>
      );
    })}
  </>
);
