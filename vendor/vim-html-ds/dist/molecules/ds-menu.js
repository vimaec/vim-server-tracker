import { el, clampFixed, registerDismissable } from "../dom.js";
import { DS_TIP_ATTR } from "../atoms/ds-tooltip.js";
// Idle time that clears the type-ahead prefix.
const TYPE_AHEAD_MS = 500;
export function createMenu(opts = {}) {
    let items = opts.items ?? [];
    const backdrop = el("div", "ds-menu-backdrop");
    const menu = el("div", "ds-menu");
    document.body.append(backdrop, menu);
    // The enabled rows in order — what arrows, Home/End and type-ahead move through (disabled rows
    // are skipped, never focused).
    let rows = [];
    let anchorEl = null;
    let typed = "";
    let typedAt = 0;
    const build = () => {
        menu.textContent = "";
        rows = [];
        for (const it of items) {
            if (it === "separator") {
                menu.appendChild(el("div", "ds-menu__sep"));
                continue;
            }
            const row = el("div", "ds-menu__item" + (it.disabled ? " ds-disabled" : "") + (it.selected ? " ds-selected" : ""));
            row.tabIndex = it.disabled ? -1 : 0;
            if (it.tip)
                row.setAttribute(DS_TIP_ATTR, it.tip);
            if (it.icon) {
                const ic = el("span", "ds-icon", it.icon);
                if (it.iconColor)
                    ic.style.color = it.iconColor;
                row.appendChild(ic);
            }
            if (it.dot) {
                const d = el("span", "ds-seldot");
                d.style.background = it.dot;
                row.appendChild(d);
            }
            row.appendChild(el("span", "ds-menu__label", it.label));
            if (it.hint)
                row.appendChild(el("span", "ds-menu__hint", it.hint));
            const go = () => { close(); it.onClick?.(it); };
            row.addEventListener("click", go);
            row.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                go();
            } });
            menu.appendChild(row);
            if (!it.disabled)
                rows.push({ el: row, label: it.label });
        }
    };
    const focusIndex = () => rows.findIndex((r) => r.el === document.activeElement);
    const focusAt = (i) => rows[i]?.el.focus();
    // Prefix search over the enabled labels: a repeated single letter cycles through the rows that
    // start with it, a longer prefix narrows from the focused row. A miss leaves focus alone.
    const typeAhead = (ch) => {
        const now = Date.now();
        if (now - typedAt > TYPE_AHEAD_MS)
            typed = "";
        typedAt = now;
        const c = ch.toLowerCase();
        if (typed !== c)
            typed += c;
        const from = typed.length === 1 ? focusIndex() + 1 : Math.max(focusIndex(), 0);
        for (let k = 0; k < rows.length; k++) {
            const r = rows[(from + k) % rows.length];
            if (r.label.toLowerCase().startsWith(typed)) {
                r.el.focus();
                return;
            }
        }
    };
    const onMenuKey = (e) => {
        if (!menu.classList.contains("ds-open"))
            return;
        const k = e.key;
        if (k === "Tab") {
            close();
            return;
        } // the default focus move runs from the restored anchor
        if (k === "Enter" || k === " ")
            return; // the row's own handler activates
        if (k === "ArrowDown" || k === "ArrowUp" || k === "Home" || k === "End") {
            const n = rows.length;
            if (!n)
                return;
            const i = focusIndex();
            e.preventDefault();
            focusAt(k === "Home" ? 0 : k === "End" ? n - 1 : k === "ArrowDown" ? (i + 1) % n : i <= 0 ? n - 1 : i - 1);
            return;
        }
        if (k.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            typeAhead(k);
        }
    };
    menu.addEventListener("keydown", onMenuKey);
    let unregister = null;
    const close = () => {
        unregister?.();
        unregister = null;
        backdrop.classList.remove("ds-open");
        menu.classList.remove("ds-open");
        menu.removeAttribute("data-vf-keys");
        typed = "";
        const active = document.activeElement;
        if (active && menu.contains(active)) {
            if (anchorEl)
                anchorEl.focus();
            else
                active.blur();
        }
        anchorEl = null;
    };
    const open = (x, y, anchor) => {
        build();
        anchorEl = anchor;
        typed = "";
        backdrop.classList.add("ds-open");
        menu.classList.add("ds-open");
        // The host routes keys by the focused element's mode, ancestors included: with this attribute on
        // the open menu a focused row is a text field, so letters type ahead here instead of reaching
        // the viewport shortcuts.
        menu.setAttribute("data-vf-keys", "");
        unregister = registerDismissable(close); // a press over the 3D closes it via the host broadcast
        clampFixed(menu, x, y);
        rows[0]?.el.focus();
    };
    backdrop.addEventListener("mousedown", close);
    const onKey = (e) => { if (e.key === "Escape")
        close(); };
    document.addEventListener("keydown", onKey);
    return {
        el: menu,
        openAt: (x, y) => open(x, y, null),
        openUnder: (anchor) => { const r = anchor.getBoundingClientRect(); open(r.left, r.bottom + 2, anchor); },
        close,
        setItems: (next) => { items = next; },
        destroy: () => {
            unregister?.();
            unregister = null;
            document.removeEventListener("keydown", onKey);
            backdrop.remove();
            menu.remove();
        },
    };
}
