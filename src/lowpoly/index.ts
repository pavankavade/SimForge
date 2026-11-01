/**
 * Clean low-poly look (the three.js low-poly dungeon demo style): chamfered,
 * flat-shaded blocks, a muted palette, one soft sun and deep AO. Props only;
 * the cast stays ink & vinyl. Set `shadows: "variance"` in the episode config
 * so `LowPolyLight` can soften the shadows.
 *
 *  - geometry   chamferBox, chamferPrism, chamferWedge, facetBlob (cached hulls)
 *  - materials  LP palette, matte(color), steel()
 *  - parts      <Block>, <Prism>, <Wedge>, <Blob>, <OctagonFloor>, <PlankFloor>
 *  - Lighting   <LowPolyLight>, LOWPOLY_POSTFX, LOWPOLY_GRADE
 */
export * from "./geometry";
export * from "./materials";
export * from "./parts";
export * from "./Lighting";
