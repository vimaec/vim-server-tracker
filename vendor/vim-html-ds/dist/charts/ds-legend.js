import { el, handle } from "../dom.js";
export function createLegend(host, opts = {}) {
    const root = el("div", "ds-legendbox");
    let rows = opts.rows ?? [];
    const render = () => {
        root.textContent = "";
        rows.forEach((r, i) => {
            const item = el("div", "ds-legendbox__row" + (r.band === "context" ? " ds-legendbox__row--context" : "") + (opts.onActivate ? " ds-legendbox__row--action" : ""));
            const sw = el("span", "ds-legendbox__swatch");
            sw.style.background = r.color;
            item.appendChild(sw);
            item.appendChild(el("span", "ds-legendbox__label", r.label));
            if (r.count != null)
                item.appendChild(el("span", "ds-legendbox__count", String(r.count)));
            if (opts.onActivate) {
                item.tabIndex = 0;
                item.setAttribute("role", "button");
                item.addEventListener("click", () => opts.onActivate(r, i));
                item.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    opts.onActivate(r, i);
                } });
            }
            root.appendChild(item);
        });
    };
    render();
    host.appendChild(root);
    return handle(root, { setRows: (next) => { rows = next; render(); } });
}
