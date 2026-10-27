import { el, handle } from "../dom.js";
import { svgEl, chartRoot, legend, seriesColor, colorScale } from "./chart-util.js";
// Share-of-whole. Default = stacked flat bar (most ImGui-faithful); variant: "pie".
// parts: [{ name, value }] (values normalised to 100%).
export function createProportion(host, opts = {}) {
    const root = chartRoot(host);
    const render = (parts) => {
        root.textContent = "";
        const total = parts.reduce((a, p) => a + p.value, 0) || 1;
        const pct = parts.map((p) => (p.value / total) * 100);
        if (opts.variant === "pie") {
            const row = el("div");
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.gap = "20px";
            const svg = svgEl("svg", { width: 88, height: 88, viewBox: "0 0 88 88" });
            let a0 = -Math.PI / 2;
            const pt = (a) => `${(44 + 40 * Math.cos(a)).toFixed(2)},${(44 + 40 * Math.sin(a)).toFixed(2)}`;
            parts.forEach((p, i) => {
                const a1 = a0 + (p.value / total) * 2 * Math.PI;
                // Each wedge is drawn as two sub-arcs split at its midpoint: no large-arc flag needed, and
                // a 100% part still renders (a single full-circle arc ends where it starts and draws nothing).
                const aMid = (a0 + a1) / 2;
                const path = svgEl("path", { d: `M44,44 L${pt(a0)} A40,40 0 0 1 ${pt(aMid)} A40,40 0 0 1 ${pt(a1)} Z` });
                path.style.fill = p.color ?? seriesColor(i);
                path.style.stroke = "var(--stage-950)";
                path.style.strokeWidth = "1";
                svg.appendChild(path);
                a0 = a1;
            });
            row.appendChild(svg);
            const leg = el("div", "ds-legend");
            leg.style.flexDirection = "column";
            leg.style.gap = "6px";
            leg.style.alignItems = "flex-start";
            parts.forEach((p, i) => {
                const item = el("span", "ds-legend__item");
                const sw = el("span", "ds-legend__swatch");
                sw.style.background = p.color ?? seriesColor(i);
                item.append(sw, document.createTextNode(`${p.name} ${Math.round(pct[i])}%`));
                leg.appendChild(item);
            });
            row.appendChild(leg);
            root.appendChild(row);
        }
        else {
            const bar = el("div", "ds-propbar");
            parts.forEach((p, i) => {
                const seg = el("div", "ds-propbar__seg");
                seg.style.width = pct[i] + "%";
                seg.style.background = p.color ?? seriesColor(i);
                bar.appendChild(seg);
            });
            root.appendChild(bar);
            legend(root, parts.map((p, i) => ({ label: `${p.name} ${Math.round(pct[i])}%`, color: p.color ?? seriesColor(i) })));
        }
    };
    render(opts.parts ?? []);
    return handle(root, { setParts: render });
}
export function createProportionGroup(host, opts = {}) {
    const root = chartRoot(host);
    const shared = (opts.scale ?? "shared") === "shared";
    const render = (rows) => {
        root.textContent = "";
        // Stable colour per part name across every row (the small-multiples comparability requirement).
        const scale = colorScale(rows.flatMap((row) => row.parts.map((p) => p.name)));
        const colorOf = (p) => p.color ?? scale(p.name);
        const totals = rows.map((row) => row.parts.reduce((a, p) => a + p.value, 0));
        const maxTotal = Math.max(1, ...totals);
        const group = el("div", "ds-propgroup");
        rows.forEach((row, ri) => {
            const total = totals[ri] || 1;
            const line = el("div", "ds-propgroup__row");
            line.appendChild(el("span", "ds-propgroup__label", row.label));
            const track = el("div", "ds-propgroup__track");
            const bar = el("div", "ds-propbar");
            bar.style.width = (shared ? (totals[ri] / maxTotal) * 100 : 100) + "%";
            row.parts.forEach((p) => {
                const seg = el("div", "ds-propbar__seg");
                seg.style.width = (p.value / total) * 100 + "%";
                seg.style.background = colorOf(p);
                bar.appendChild(seg);
            });
            track.appendChild(bar);
            line.appendChild(track);
            group.appendChild(line);
        });
        root.appendChild(group);
        // One shared legend for the whole small-multiples set.
        legend(root, scale.keys.map((name) => ({ label: name, color: scale(name) })));
    };
    render(opts.rows ?? []);
    return handle(root, { setRows: render });
}
