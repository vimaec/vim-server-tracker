import { el, handle } from "../dom.js";
import { triState, toggleTri } from "../tree-select.js";
export function createTree(host, opts = {}) {
    let items = opts.items ?? [];
    let selected = opts.selected ?? null;
    const multi = opts.selectionMode === "multi-tristate";
    let checked = new Set(opts.checkedIds ?? []);
    const triOf = (it) => ({ id: it.id ?? it.label, children: it.children?.map(triOf) });
    const root = el("div", "ds-tree");
    root.setAttribute("role", "tree");
    const render = () => {
        root.textContent = "";
        if (opts.loading) {
            for (let i = 0; i < 4; i++) {
                const r = el("div", "ds-tree__item ds-leaf");
                const s = el("span", "ds-skeleton");
                s.style.height = "12px";
                s.style.width = 55 + (i % 3) * 12 + "%";
                s.style.marginLeft = "10px";
                r.appendChild(s);
                root.appendChild(r);
            }
            return;
        }
        if (items.length === 0 && opts.empty != null) {
            const e = el("div", "ds-empty-cell");
            if (typeof opts.empty === "string")
                e.textContent = opts.empty;
            else
                e.appendChild(opts.empty);
            root.appendChild(e);
            return;
        }
        const walk = (list, depth) => {
            for (const it of list) {
                const leaf = !it.children?.length;
                const row = el("button", "ds-tree__item" + (leaf ? " ds-leaf" : "") + (it.open ? " ds-open" : "")
                    + ((it.id ?? it.label) === selected ? " ds-sel" : "") + (it.locked ? " ds-locked" : ""));
                row.type = "button";
                row.style.setProperty("--depth", String(depth));
                row.setAttribute("role", "treeitem");
                row.setAttribute("aria-selected", String((it.id ?? it.label) === selected));
                if (!leaf)
                    row.setAttribute("aria-expanded", String(!!it.open));
                if (opts.checkable || multi) {
                    const st = multi ? triState(triOf(it), checked) : it.checked;
                    const cell = el("span", "ds-tree__check");
                    const check = el("button", "ds-check" + (st === "on" ? " ds-on" : st === "partial" ? " ds-partial" : ""));
                    check.type = "button";
                    check.appendChild(el("span", "ds-check__box"));
                    check.addEventListener("click", (e) => {
                        e.stopPropagation();
                        if (multi) {
                            checked = toggleTri(triOf(it), checked);
                            render();
                            opts.onCheckedChange?.([...checked]);
                        }
                        opts.onCheck?.(it);
                    });
                    cell.appendChild(check);
                    row.appendChild(cell);
                }
                row.appendChild(el("span", "ds-tree__caret"));
                const label = el("span", "ds-tree__label");
                if (it.render)
                    label.appendChild(it.render(it));
                else
                    label.textContent = it.label;
                row.appendChild(label);
                if (it.tag != null && it.tag !== "")
                    row.appendChild(el("span", "ds-tree__tag", it.tag));
                if (it.meta != null)
                    row.appendChild(el("span", "ds-tree__meta", String(it.meta)));
                row.addEventListener("click", () => {
                    if (!leaf) {
                        it.open = !it.open;
                        opts.onToggle?.(it);
                        render();
                    }
                    selected = it.id ?? it.label;
                    opts.onSelect?.(selected, it);
                    if (leaf)
                        render();
                });
                root.appendChild(row);
                if (!leaf && it.open)
                    walk(it.children, depth + 1);
            }
        };
        walk(items, 0);
    };
    render();
    host.appendChild(root);
    return handle(root, {
        setItems: (next) => { items = next; render(); },
        getSelected: () => selected,
        setSelected: (id) => { selected = id; render(); },
        getCheckedIds: () => [...checked],
        setCheckedIds: (ids) => { checked = new Set(ids); render(); },
    });
}
