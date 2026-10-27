import { el, handle, rovingFocus } from "../dom.js";
import { windowRange } from "../virtual.js";
import { createIconButton } from "../atoms/ds-icon-button.js";
function skeletonRows(root, rowClass) {
    for (let i = 0; i < 4; i++) {
        const r = el("div", rowClass);
        const s = el("span", "ds-skeleton");
        s.style.height = "12px";
        s.style.width = 55 + (i % 3) * 12 + "%";
        r.appendChild(s);
        root.appendChild(r);
    }
}
export function createList(host, opts = {}) {
    const virtual = opts.virtual;
    const root = el("div", "ds-list" + (opts.selectable ? " ds-list--selectable" : "") + (virtual ? " ds-list--virtual" : "")
        + (opts.maxHeight != null ? " ds-list--scroll" : ""));
    if (opts.maxHeight != null)
        root.style.maxHeight = typeof opts.maxHeight === "number" ? opts.maxHeight + "px" : opts.maxHeight;
    root.setAttribute("role", opts.selectable ? "listbox" : "list");
    let selected = opts.selected ?? null;
    let items = opts.items ?? [];
    const rows = new Map();
    const apply = () => {
        for (const [id, r] of rows) {
            const on = id === selected;
            r.classList.toggle("ds-sel", on);
            if (opts.selectable)
                r.setAttribute("aria-selected", String(on));
        }
    };
    const buildRow = (it) => {
        const id = it.id ?? it.label;
        const row = el("div", "ds-list__item" + (it.dim ? " ds-list__item--dim" : ""));
        row.setAttribute("role", opts.selectable ? "option" : "listitem");
        if (it.tip)
            row.setAttribute("data-ds-tip", it.tip);
        if (opts.selectable)
            row.setAttribute("aria-selected", String(id === selected));
        if (it.icon)
            row.appendChild(el("span", "ds-icon", it.icon));
        const label = el("span", "ds-list__label");
        if (it.render)
            label.appendChild(it.render(it));
        else
            label.textContent = it.label;
        row.appendChild(label);
        if (it.meta != null)
            row.appendChild(el("span", "ds-list__meta", String(it.meta)));
        if (it.actions?.length) {
            const box = el("span", "ds-list__actions");
            for (const a of it.actions) {
                const b = createIconButton(box, {
                    icon: a.icon,
                    variant: a.danger ? "danger" : undefined,
                    tip: a.tip,
                    disabled: a.disabled,
                    onClick: (e) => {
                        e.stopPropagation(); // the action's click, never a selection gesture
                        if (!a.disabled)
                            a.onClick(it);
                    },
                });
                b.el.setAttribute("aria-label", a.tip);
                if (a.disabled)
                    b.el.setAttribute("aria-disabled", "true");
            }
            row.appendChild(box);
        }
        if (opts.selectable)
            row.addEventListener("click", (e) => {
                // Guard interactive descendants generally, not just our own buttons — a custom render() can
                // put an input in the row too.
                if (e.target instanceof Element && e.target.closest("button, input, select, a, .ds-iconbtn"))
                    return;
                selected = id;
                apply();
                opts.onSelect?.(selected, it);
            });
        row.classList.toggle("ds-sel", id === selected);
        rows.set(id, row);
        return row;
    };
    const emptyOrLoad = (target) => {
        if (opts.loading) {
            skeletonRows(target, "ds-list__item");
            return true;
        }
        if (items.length === 0 && opts.empty != null) {
            const e = el("div", "ds-empty-cell");
            if (typeof opts.empty === "string")
                e.textContent = opts.empty;
            else
                e.appendChild(opts.empty);
            target.appendChild(e);
            return true;
        }
        return false;
    };
    if (virtual) {
        const rowH = virtual.rowHeight;
        const spacer = el("div", "ds-list__spacer");
        const win = el("div", "ds-list__rows");
        root.append(spacer, win);
        let raf = 0;
        const paint = () => {
            raf = 0;
            rows.clear();
            win.textContent = "";
            win.style.transform = "translateY(0)";
            spacer.style.height = "0px";
            if (emptyOrLoad(win))
                return;
            const w = windowRange({ scrollTop: root.scrollTop, viewportHeight: root.clientHeight || 0, rowHeight: rowH, rowCount: items.length, overscan: virtual.overscan });
            spacer.style.height = w.totalHeight + "px";
            win.style.transform = `translateY(${w.offsetY}px)`;
            for (let i = w.firstIndex; i <= w.lastIndex; i++)
                win.appendChild(buildRow(items[i]));
            rovingFocus(root, ".ds-list__item");
        };
        root.addEventListener("scroll", () => { if (!raf)
            raf = requestAnimationFrame(paint); });
        if (typeof ResizeObserver !== "undefined")
            new ResizeObserver(() => paint()).observe(root);
        host.appendChild(root);
        paint();
        return handle(root, {
            setItems: (next) => { items = next; paint(); },
            getSelected: () => selected,
            setSelected: (id) => { selected = id; apply(); },
        });
    }
    const render = (next) => {
        items = next;
        root.textContent = "";
        rows.clear();
        if (emptyOrLoad(root))
            return;
        for (const it of items)
            root.appendChild(buildRow(it));
        apply();
        rovingFocus(root, ".ds-list__item");
    };
    render(items);
    host.appendChild(root);
    return handle(root, {
        setItems: render,
        getSelected: () => selected,
        setSelected: (id) => { selected = id; apply(); },
    });
}
