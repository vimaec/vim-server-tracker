import { el, handle } from "../dom.js";
const RANK_TONE = { 4: "bad", 3: "warn", 2: "teal", 1: "good" };
export function createRankedBar(host, opts = {}) {
    let items = opts.items ?? [];
    let expanded = opts.expanded ?? false;
    const root = el("div", "ds-rankbar");
    const render = () => {
        root.textContent = "";
        const total = items.reduce((a, it) => a + (it.count ?? 1), 0);
        const head = el("div", "ds-rankbar__head");
        head.setAttribute("role", "button");
        head.setAttribute("aria-expanded", String(expanded));
        head.appendChild(el("span", "ds-rankbar__caret", expanded ? "▾" : "▸"));
        head.appendChild(el("span", "ds-rankbar__title", opts.title ?? ""));
        head.appendChild(el("span", "ds-rankbar__total", String(total)));
        head.addEventListener("click", () => { expanded = !expanded; render(); });
        root.appendChild(head);
        if (expanded) {
            const list = el("div", "ds-rankbar__list");
            [...items].sort((a, b) => b.rank - a.rank).forEach((it) => {
                const row = el("div", "ds-rankbar__row" + (opts.onActivate ? " ds-rankbar__row--action" : ""));
                row.appendChild(el("span", "ds-dot ds-dot--" + (RANK_TONE[it.rank] ?? "")));
                row.appendChild(el("span", "ds-rankbar__label", it.label));
                if (it.count != null)
                    row.appendChild(el("span", "ds-rankbar__count", String(it.count)));
                if (opts.onActivate) {
                    row.tabIndex = 0;
                    row.setAttribute("role", "button");
                    row.addEventListener("click", () => opts.onActivate(it));
                    row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        opts.onActivate(it);
                    } });
                }
                list.appendChild(row);
            });
            root.appendChild(list);
        }
    };
    render();
    host.appendChild(root);
    return handle(root, {
        setItems: (next) => { items = next; render(); },
        setExpanded: (v) => { expanded = v; render(); },
    });
}
