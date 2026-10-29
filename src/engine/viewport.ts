/**
 * Height in pixels of the video being rendered, as a shared shader uniform:
 * materials that size things in output pixels (the ink outline minimum) read
 * it. EpisodeCanvas sets it for every composition; 1920 (9:16) otherwise.
 */
export const OUTPUT_HEIGHT = { value: 1920 };
