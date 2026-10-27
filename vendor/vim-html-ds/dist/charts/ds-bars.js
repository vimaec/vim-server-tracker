import { handle } from "../dom.js";
import { svgEl, chartRoot, seriesColor } from "./chart-util.js";
// Flat SVG bar chart. direction: "vertical" (default) | "horizontal".
// palette: "single" (default, chart-1) | "categorical" (chart ramp per bar).
// colors: per-bar CSS color strings (index-mapped); wins over palette, and bars
// without an entry fall back to the palette rule. showValues: the vertical
// variant draws each bar's formatted value above the bar (horizontal always does).
export function createBars(host, opts = {}) {
    const root = chartRoot(host);
    const fmt = opts.format ?? ((v) => String(v));
    const render = (labels, values) => {
        root.textContent = "";
        const max = Math.max(...values, 1);
        const color = (i) => opts.colors?.[i] ?? (opts.palette === "categorical" ? seriesColor(i) : "var(--chart-1)");
        if (opts.direction === "horizontal") {
            const rowH = 26, labelW = 96, W = 300, H = values.length * rowH + 6;
            const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
            svg.appendChild(svgEl("line", { class: "ds-chart__axis", x1: labelW, y1: 2, x2: labelW, y2: H - 2 }));
            values.forEach((v, i) => {
                const y = i * rowH + 6;
                const t = svgEl("text", { class: "ds-chart__tick", x: labelW - 6, y: y + 10, "text-anchor": "end" });
                t.textContent = String(labels[i]).toUpperCase();
                const w = Math.round((v / max) * (W - labelW - 30));
                const r = svgEl("rect", { x: labelW + 1, y, width: w, height: 12 });
                r.style.fill = color(i);
                const val = svgEl("text", { class: "ds-chart__val", x: labelW + 1 + w + 5, y: y + 10 });
                val.textContent = fmt(v);
                svg.append(t, r, val);
            });
            root.appendChild(svg);
        }
        else {
            const W = 300, H = 130, top = 20, base = 100;
            const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
            const gridY = [top, (top + base) / 2];
            for (const y of gridY)
                svg.appendChild(svgEl("line", { class: "ds-chart__grid", x1: 24, y1: y, x2: W - 4, y2: y }));
            svg.appendChild(svgEl("line", { class: "ds-chart__axis", x1: 24, y1: base, x2: W - 4, y2: base }));
            const tickVals = [max, max / 2, 0];
            [top, (top + base) / 2, base].forEach((y, i) => {
                const t = svgEl("text", { class: "ds-chart__tick", x: 20, y: y + 3, "text-anchor": "end" });
                t.textContent = fmt(Math.round(tickVals[i]));
                svg.appendChild(t);
            });
            const n = values.length, span = (W - 36) / n;
            values.forEach((v, i) => {
                const h = Math.round((v / max) * (base - top));
                const bw = Math.min(26, span * 0.6);
                const x = 30 + i * span + (span - bw) / 2;
                const r = svgEl("rect", { x, y: base - h, width: bw, height: h });
                r.style.fill = color(i);
                const t = svgEl("text", { class: "ds-chart__tick", x: x + bw / 2, y: base + 14, "text-anchor": "middle" });
                t.textContent = String(labels[i]).toUpperCase();
                svg.append(r, t);
                if (opts.showValues) {
                    const val = svgEl("text", { class: "ds-chart__val", x: x + bw / 2, y: base - h - 4, "text-anchor": "middle" });
                    val.textContent = fmt(v);
                    svg.appendChild(val);
                }
            });
            root.appendChild(svg);
        }
    };
    render(opts.labels ?? [], opts.values ?? []);
    return handle(root, { setData: (labels, values) => render(labels, values) });
}
