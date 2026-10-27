// Color-system utilities — the two ways a value earns a colour. sampleGradient is the value engine
// behind heat cells / gradient columns: it maps a numeric value onto a piecewise-linear color ramp.
// categoricalPalette is its unordered counterpart: N mutually distinct colours for N distinct
// values. Both compute a colour the consumer applies inline (rows are rebuilt per frame, so
// consumers call these directly rather than through a factory); the LOOK stays a class (.ds-heat,
// .ds-dot).
/** The DS heat ramp (low → high = calm → hot): the health triad, read from the LIVE tokens so the
 *  ramp follows a theme flip. Pass `stops` for an absolute axis (e.g. [100, 1000, 10000] faces);
 *  omit them for auto min→max scaling. Values resolve at CREATION time — build the gradient where
 *  you define the column, not at module load. Falls back to the dark-theme hexes without a DOM. */
export function heatGradient(stops) {
    const fallback = ["#6FB582", "#E9B23A", "#E5664A"]; // --health-green/-amber/-red (dark theme)
    const names = ["--health-green", "--health-amber", "--health-red"];
    let colors = fallback;
    if (typeof document !== "undefined") {
        const css = getComputedStyle(document.documentElement);
        colors = names.map((n, i) => css.getPropertyValue(n).trim() || fallback[i]);
    }
    return stops ? { colors, stops } : { colors };
}
/** Parse `#rgb` / `#rrggbb` (the `#` optional) into an `[r,g,b]` triple, 0–255. An unreadable
 *  channel reads 0 — this is a display helper, not a validator. */
export function hexToRgb(c) {
    let h = c.replace("#", "");
    if (h.length === 3)
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
}
/** Sample `g` at value `v`, returning an `[r,g,b]` triple (0–255). With `stops`, `v` is placed on that
 *  axis (clamped to the ends); otherwise `v` is normalized across `range` (min → max) and sampled
 *  evenly over the colors. `range` is ignored when `stops` are given, and defaults to 0..1. */
export function sampleGradient(g, v, range) {
    const rgb = g.colors.map(hexToRgb);
    if (rgb.length === 1)
        return rgb[0];
    // Explicit stops: place v on the stop axis, piecewise-linear between the two bracketing colors.
    if (g.stops && g.stops.length === g.colors.length) {
        if (v <= g.stops[0])
            return rgb[0];
        if (v >= g.stops[g.stops.length - 1])
            return rgb[rgb.length - 1];
        let i = 1;
        while (i < g.stops.length && v > g.stops[i])
            i++;
        const span = g.stops[i] - g.stops[i - 1] || 1;
        const f = (v - g.stops[i - 1]) / span;
        const a = rgb[i - 1], b = rgb[i];
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
    // Auto range: normalize v to 0..1 across the observed min/max, then sample evenly over the colors.
    const r = range || { min: 0, max: 1 };
    const t = r.max > r.min ? (v - r.min) / (r.max - r.min) : 0;
    const scaled = Math.min(Math.max(t, 0), 1) * (rgb.length - 1);
    const i = Math.min(Math.floor(scaled), rgb.length - 2);
    const f = scaled - i;
    const a = rgb[i], b = rgb[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
// ---- Categorical colours (colour-BY-value looks: a tree's colour override, a legend) -----------
// Distinct from the ramps above: no order and no magnitude, only "these N values must not be
// confused with one another".
const GOLDEN_ANGLE = 137.508; // successive hues land as far apart as a constant step can put them
// mulberry32 — a 32-bit PRNG whose whole state is the seed, so a palette is reproducible from its
// seed alone (the shuffle just hands over a new one).
function seededRandom(seed) {
    let a = (seed >>> 0) + 0x6D2B79F5;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function hslHex(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const seg = Math.floor(((h % 360) + 360) % 360 / 60);
    const rgb = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][seg];
    return "#" + rgb.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}
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
export function categoricalPalette(n, seed = 0) {
    if (n <= 0)
        return [];
    const rand = seededRandom(seed);
    const offset = seed === 0 ? 20 : rand() * 360; // seed 0 is the stable default palette
    const out = [];
    for (let i = 0; i < n; i++) {
        const h = (offset + i * GOLDEN_ANGLE) % 360;
        // Two lightness/saturation bands, alternating: adjacent hues then differ in value as well as
        // hue, which is what keeps 20+ buckets apart.
        const light = i % 2 === 0;
        out.push(hslHex(h, light ? 0.62 : 0.5, light ? 0.62 : 0.46));
    }
    if (seed === 0)
        return out;
    for (let i = out.length - 1; i > 0; i--) { // Fisher-Yates, seeded
        const j = Math.floor(rand() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}
