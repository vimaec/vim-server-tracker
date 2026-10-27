import { el, handle } from "../dom.js";
import { svgEl, chartRoot, seriesColor } from "./chart-util.js";
export function createDonut(host, opts = {}) {
    const size = opts.size ?? 120;
    const thickness = opts.thickness ?? 18;
    let parts = opts.parts ?? [];
    let centerValue = opts.centerValue;
    let centerLabel = opts.centerLabel;
    const root = chartRoot(host);
    const render = () => {
        root.textContent = "";
        const total = parts.reduce((a, p) => a + p.value, 0) || 1;
        const wrap = el("div");
        wrap.style.display = "flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "20px";
        const donut = el("div", "ds-donut");
        donut.style.width = size + "px";
        donut.style.height = size + "px";
        const svg = svgEl("svg", { width: size, height: size, viewBox: `0 0 ${size} ${size}` });
        const cx = size / 2, cy = size / 2, R = size / 2 - 1, r = Math.max(0, R - thickness);
        const pt = (rad, a) => `${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`;
        let a0 = -Math.PI / 2; // 12 o'clock
        parts.forEach((p, i) => {
            const a1 = a0 + (p.value / total) * 2 * Math.PI;
            // Split each segment at its midpoint: every sub-arc stays ≤ π, so no large-arc flag is needed
            // and a 100% part still renders as a full ring (same trick as the pie).
            const aMid = (a0 + a1) / 2;
            const d = `M${pt(R, a0)} A${R},${R} 0 0 1 ${pt(R, aMid)} A${R},${R} 0 0 1 ${pt(R, a1)}`
                + ` L${pt(r, a1)} A${r},${r} 0 0 0 ${pt(r, aMid)} A${r},${r} 0 0 0 ${pt(r, a0)} Z`;
            const path = svgEl("path", { d });
            path.style.fill = p.color ?? seriesColor(i);
            path.style.stroke = "var(--stage-950)";
            path.style.strokeWidth = "1";
            if (opts.onSlice) {
                path.style.cursor = "pointer";
                path.addEventListener("click", () => opts.onSlice(p, i));
            }
            svg.appendChild(path);
            a0 = a1;
        });
        donut.appendChild(svg);
        const center = el("div", "ds-donut__center");
        if (centerValue != null)
            center.appendChild(el("div", "ds-donut__value", String(centerValue)));
        if (centerLabel)
            center.appendChild(el("div", "ds-donut__label", centerLabel));
        donut.appendChild(center);
        wrap.appendChild(donut);
        const leg = el("div", "ds-legend");
        leg.style.flexDirection = "column";
        leg.style.gap = "6px";
        leg.style.alignItems = "flex-start";
        parts.forEach((p, i) => {
            const item = el("span", "ds-legend__item");
            const sw = el("span", "ds-legend__swatch");
            sw.style.background = p.color ?? seriesColor(i);
            item.append(sw, document.createTextNode(`${p.name} ${p.value}`));
            leg.appendChild(item);
        });
        wrap.appendChild(leg);
        root.appendChild(wrap);
    };
    render();
    return handle(root, {
        setParts: (p) => { parts = p; render(); },
        setCenter: (v, l) => { centerValue = v; centerLabel = l; render(); },
    });
}
