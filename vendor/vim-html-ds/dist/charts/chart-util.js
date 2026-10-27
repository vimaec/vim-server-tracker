// Shared chart SVG helpers — internal, not re-exported by the barrel.
const NS = "http://www.w3.org/2000/svg";
export function svgEl(tag, attrs = {}) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs))
        n.setAttribute(k, String(v));
    return n;
}
export function chartRoot(host) {
    const root = document.createElement("div");
    root.className = "ds-chart";
    host.appendChild(root);
    return root;
}
export function legend(root, entries) {
    const box = document.createElement("div");
    box.className = "ds-legend";
    for (const e of entries) {
        const item = document.createElement("span");
        item.className = "ds-legend__item";
        const sw = document.createElement("span");
        sw.className = "ds-legend__swatch";
        sw.style.background = e.color;
        item.appendChild(sw);
        item.appendChild(document.createTextNode(e.label));
        box.appendChild(item);
    }
    root.appendChild(box);
    return box;
}
export const seriesColor = (i) => `var(--chart-${(i % 5) + 1})`;
export function colorScale(keys) {
    const order = [];
    for (const k of keys)
        if (!order.includes(k))
            order.push(k);
    const fn = ((key) => seriesColor(order.indexOf(key)));
    fn.keys = order;
    return fn;
}
