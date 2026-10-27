import { el, handle } from "../dom.js";
const NS = "http://www.w3.org/2000/svg";
const ARC = "M 8 60 A 52 52 0 0 1 112 60";
export function createGauge(host, opts = {}) {
    const max = opts.max ?? 100;
    const root = el("div", "ds-gauge");
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 120 66");
    svg.setAttribute("width", "120");
    svg.setAttribute("height", "66");
    const track = document.createElementNS(NS, "path");
    track.setAttribute("class", "ds-gauge__track");
    const val = document.createElementNS(NS, "path");
    val.setAttribute("class", "ds-gauge__value" + (opts.tone && opts.tone !== "cyan" ? " ds-gauge__value--" + opts.tone : ""));
    for (const p of [track, val]) {
        p.setAttribute("d", ARC);
        p.setAttribute("fill", "none");
        p.setAttribute("stroke-width", "8");
        svg.appendChild(p);
    }
    val.setAttribute("pathLength", "100");
    const num = el("div", "ds-gauge__num");
    const cap = el("div", "ds-gauge__cap", opts.label ?? "");
    const set = (v) => {
        const pct = Math.max(0, Math.min(100, (v / max) * 100));
        val.setAttribute("stroke-dasharray", pct.toFixed(1) + " 100");
        num.textContent = opts.format ? opts.format(v) : Math.round(pct) + "%";
    };
    set(opts.value ?? 0);
    root.append(svg, num, cap);
    host.appendChild(root);
    return handle(root, { setValue: set, setLabel: (t) => { cap.textContent = t; } });
}
