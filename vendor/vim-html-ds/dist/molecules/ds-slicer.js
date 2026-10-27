import { el, handle } from "../dom.js";
import { createSearch } from "../atoms/ds-search.js";
import { createCheckbox } from "../atoms/ds-checkbox.js";
export function createSlicer(host, opts = {}) {
    const values = opts.values ?? [];
    let selected = new Set(opts.selected ?? values);
    let query = "";
    const root = el("div", "ds-slicer");
    if (opts.title)
        root.appendChild(el("div", "ds-slicer__title", opts.title));
    const head = el("div", "ds-slicer__head");
    const allRow = el("div", "ds-slicer__all");
    const list = el("div", "ds-slicer__list");
    root.append(head, allRow, list);
    host.appendChild(root);
    createSearch(head, {
        placeholder: `Search ${(opts.field ?? "values").toLowerCase()}…`,
        onInput: (q) => { query = q.toLowerCase(); renderList(); },
    });
    const allCheck = createCheckbox(allRow, {
        label: "Select all",
        onChange: (s) => {
            selected = s === "on" ? new Set(values) : new Set();
            renderList();
            syncAll();
            emit();
        },
    });
    const syncAll = () => {
        allCheck.setState(selected.size === 0 ? "off" : selected.size === values.length ? "on" : "partial");
    };
    const emit = () => opts.onChange?.([...selected]);
    const itemChecks = new Map();
    const renderList = () => {
        list.textContent = "";
        itemChecks.clear();
        for (const v of values) {
            if (query && !v.toLowerCase().includes(query))
                continue;
            const row = el("div", "ds-slicer__item");
            const c = createCheckbox(row, {
                label: v,
                state: selected.has(v) ? "on" : "off",
                onChange: (s) => { s === "on" ? selected.add(v) : selected.delete(v); syncAll(); emit(); },
            });
            itemChecks.set(v, c);
            const n = opts.counts?.[v];
            if (n != null)
                row.appendChild(el("span", "ds-slicer__count", String(n)));
            list.appendChild(row);
        }
    };
    renderList();
    syncAll();
    return handle(root, {
        getSelected: () => [...selected],
        setSelected: (next) => { selected = new Set(next); renderList(); syncAll(); },
    });
}
