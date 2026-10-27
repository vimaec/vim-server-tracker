import { el, handle } from "../dom.js";
export function createHeatCell(host, opts = {}) {
    const root = el("span", "ds-heat", opts.text ?? "");
    const apply = (tone, intensity) => {
        const pct = Math.round(Math.max(0, Math.min(1, intensity ?? 0.5)) * 70);
        root.style.background = `color-mix(in srgb, var(--health-${tone}) ${pct}%, transparent)`;
    };
    apply(opts.tone ?? "green", opts.intensity);
    host.appendChild(root);
    return handle(root, {
        setText: (t) => { root.textContent = t; },
        set: (tone, intensity) => apply(tone, intensity),
    });
}
