import { handle } from "../dom.js";
import { svgEl, chartRoot, legend, seriesColor } from "./chart-util.js";
// SVG polyline chart on hairline grid, SQUARE markers. series: [{ name, values }].
// area: true fills the first series with the cyan tint.
export function createLine(host, opts = {}) {
    const root = chartRoot(host);
    const render = (labels, series) => {
        root.textContent = "";
        const W = 300, H = 120, top = 16, base = 96, left = 32, right = 12;
        const max = Math.max(...series.flatMap((s) => s.values), 1);
        const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}` });
        for (const y of [top, (top + base) / 2])
            svg.appendChild(svgEl("line", { class: "ds-chart__grid", x1: left - 8, y1: y, x2: W - right, y2: y }));
        svg.appendChild(svgEl("line", { class: "ds-chart__axis", x1: left - 8, y1: base, x2: W - right, y2: base }));
        const tickVals = [max, max / 2, 0];
        [top, (top + base) / 2, base].forEach((y, i) => {
            const t = svgEl("text", { class: "ds-chart__tick", x: left - 12, y: y + 3, "text-anchor": "end" });
            t.textContent = String(Math.round(tickVals[i]));
            svg.appendChild(t);
        });
        const n = labels.length;
        const px = (i) => left + (n > 1 ? (i * (W - left - right - 8)) / (n - 1) : 0);
        const py = (v) => base - (v / max) * (base - top);
        series.forEach((s, si) => {
            const pts = s.values.map((v, i) => px(i) + "," + py(v)).join(" ");
            if (si === 0 && opts.area) {
                const poly = svgEl("polygon", { points: pts + ` ${px(n - 1)},${base} ${px(0)},${base}` });
                poly.style.fill = "var(--vim-cyan-tint)";
                svg.appendChild(poly);
            }
            const line = svgEl("polyline", { class: "ds-chart__line", points: pts });
            line.style.stroke = seriesColor(si);
            svg.appendChild(line);
            s.values.forEach((v, i) => {
                const m = svgEl("rect", { x: px(i) - 3, y: py(v) - 3, width: 6, height: 6 });
                m.style.fill = seriesColor(si);
                svg.appendChild(m);
            });
        });
        labels.forEach((l, i) => {
            const t = svgEl("text", { class: "ds-chart__tick", x: px(i), y: base + 14, "text-anchor": "middle" });
            t.textContent = String(l);
            svg.appendChild(t);
        });
        root.appendChild(svg);
        if (series.length > 1)
            legend(root, series.map((s, i) => ({ label: s.name ?? "Series " + (i + 1), color: seriesColor(i) })));
    };
    render(opts.labels ?? [], opts.series ?? []);
    return handle(root, { setData: (labels, series) => render(labels, series) });
}
