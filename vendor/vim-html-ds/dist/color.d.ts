/** A value-driven color ramp: hex colors low → high, keyed either to explicit ascending `stops`
 *  (one per color) or auto-scaled across an observed min → max range. */
export interface Gradient {
    colors: string[];
    stops?: number[];
}
/** The DS heat ramp (low → high = calm → hot): the health triad, read from the LIVE tokens so the
 *  ramp follows a theme flip. Pass `stops` for an absolute axis (e.g. [100, 1000, 10000] faces);
 *  omit them for auto min→max scaling. Values resolve at CREATION time — build the gradient where
 *  you define the column, not at module load. Falls back to the dark-theme hexes without a DOM. */
export declare function heatGradient(stops?: number[]): Gradient;
/** Parse `#rgb` / `#rrggbb` (the `#` optional) into an `[r,g,b]` triple, 0–255. An unreadable
 *  channel reads 0 — this is a display helper, not a validator. */
export declare function hexToRgb(c: string): [number, number, number];
/** Sample `g` at value `v`, returning an `[r,g,b]` triple (0–255). With `stops`, `v` is placed on that
 *  axis (clamped to the ends); otherwise `v` is normalized across `range` (min → max) and sampled
 *  evenly over the colors. `range` is ignored when `stops` are given, and defaults to 0..1. */
export declare function sampleGradient(g: Gradient, v: number, range?: {
    min: number;
    max: number;
}): [number, number, number];
/**
 * `n` categorical colours as `#rrggbb` — the DS answer to "give every distinct value its own
 * colour". Hues walk the golden angle, so neighbours in the returned order are also far apart in
 * hue and any prefix is already well spread; saturation and lightness alternate between two fixed
 * bands chosen to read both against the dark stage and under the 3D viewport's lighting.
 *
 * `seed` re-rolls: a different seed rotates the hue walk AND permutes the assignment, so the same
 * values come back wearing different colours (the "shuffle" gesture). The same seed always yields
 * the same array.
 */
export declare function categoricalPalette(n: number, seed?: number): string[];
