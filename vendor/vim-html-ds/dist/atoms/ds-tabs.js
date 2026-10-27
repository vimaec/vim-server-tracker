import { el, handle } from "../dom.js";
import { createMenu } from "../molecules/ds-menu.js";
export function createTabs(host, opts = {}) {
    const norm = (o) => (typeof o === "string" ? { id: o, label: o } : o);
    const options = (opts.options ?? []).map(norm);
    let value = opts.value ?? options[0]?.id ?? null;
    const root = el("div", "ds-tabs" + (opts.variant === "filled" ? " ds-tabs--filled" : ""));
    const btns = new Map();
    const chips = new Map();
    const labels = new Map();
    const disabled = new Set();
    const panels = new Map();
    const order = [];
    let raf = 0; // the pending overflow measurement (see relayout)
    // The overflow trigger is the strip's LAST child (tabs insert before it) and stays hidden until a
    // measurement finds something to collapse. Its menu lists every tab, hidden or not — the whole
    // point is one place that always shows what is open.
    const more = el("button", "ds-tabs__more", "…");
    more.type = "button";
    more.setAttribute("aria-label", "More tabs");
    const menu = createMenu({});
    more.addEventListener("click", () => {
        menu.setItems(order.map((id) => ({
            label: labels.get(id) ?? id,
            selected: id === value,
            disabled: disabled.has(id),
            onClick: () => select(id),
        })));
        menu.openUnder(more);
    });
    const apply = () => {
        for (const [id, b] of btns)
            b.classList.toggle("ds-active", id === value);
        for (const [id, p] of panels)
            p.classList.toggle("ds-open", id === value);
        relayout(); // the active tab has to stay visible, so moving the value can move what fits
    };
    // The strip goes in FIRST. `panels` is routinely the same element as `host` (a page stacking the
    // strip and the bodies in one column), so appending the strip after the loop put the tabs BELOW
    // their own panels.
    host.appendChild(root);
    root.appendChild(more);
    function build(o) {
        if (btns.has(o.id))
            return;
        const b = el("button", "ds-tab");
        b.type = "button";
        b.appendChild(el("span", undefined, o.label));
        if (o.chip != null) {
            const c = el("span", "ds-chip ds-chip--cyan", String(o.chip));
            chips.set(o.id, c);
            b.appendChild(c);
        }
        if (o.closable ?? opts.closable) {
            // A span, not a button: nested interactive content is invalid HTML, and the parent tab is
            // already a button. stopPropagation keeps the × from also selecting the tab it closes.
            const x = el("span", "ds-tab__close", "×");
            x.setAttribute("role", "button");
            x.setAttribute("aria-label", "Close " + o.label);
            x.addEventListener("click", (e) => { e.stopPropagation(); opts.onClose?.(o.id); });
            b.appendChild(x);
            // Middle-click is the same report from anywhere on the tab, × included. The browser delivers
            // it as auxclick and never as click, so the two paths cannot both fire from one press. Both
            // events are cancelled: auxclick to keep the tab from becoming a paste/navigate target, and
            // the middle mousedown because that is what starts Chromium's autoscroll.
            b.addEventListener("mousedown", (e) => { if (e.button === 1)
                e.preventDefault(); });
            b.addEventListener("auxclick", (e) => {
                if (e.button !== 1)
                    return;
                e.preventDefault();
                opts.onClose?.(o.id);
            });
        }
        b.addEventListener("click", () => select(o.id));
        btns.set(o.id, b);
        labels.set(o.id, o.label);
        order.push(o.id);
        root.insertBefore(b, more);
        if (opts.panels) {
            const p = el("div", "ds-tabpanel");
            panels.set(o.id, p);
            opts.panels.appendChild(p);
        }
        relayout();
    }
    for (const o of options)
        build(o);
    function select(v) {
        if (value === v || disabled.has(v))
            return;
        value = v;
        apply();
        opts.onChange?.(v);
    }
    function removeTab(id) {
        const b = btns.get(id);
        if (!b)
            return;
        const at = order.indexOf(id);
        b.remove();
        btns.delete(id);
        chips.delete(id);
        labels.delete(id);
        disabled.delete(id);
        panels.get(id)?.remove();
        panels.delete(id);
        order.splice(at, 1);
        if (value !== id) {
            apply();
            return;
        }
        value = null;
        apply();
        const neighbour = order[at] ?? order[at - 1];
        if (neighbour)
            select(neighbour);
    }
    // One overflow pass: every tab shown, then the ones past the budget hidden again. Nothing is
    // cached between passes — a chip, a label, a font or a theme moves these widths.
    function measure() {
        const avail = root.clientWidth;
        // A strip in a closed panel measures zero everywhere, and "nothing fits" would collapse the
        // whole set. Leave the classes alone; the ResizeObserver brings it back when it is on screen.
        if (avail <= 0)
            return;
        for (const b of btns.values())
            b.classList.remove("ds-tab--overflow");
        more.classList.add("ds-show");
        let total = 0;
        const width = new Map();
        for (const id of order) {
            const w = btns.get(id).offsetWidth;
            width.set(id, w);
            total += w;
        }
        if (total <= avail) {
            more.classList.remove("ds-show");
            return;
        }
        // Something must go, so the … button now costs width too. The active tab is reserved before
        // any other: it is the one tab a user must never lose sight of.
        const budget = avail - more.offsetWidth;
        const keep = new Set();
        let used = 0;
        if (value != null && btns.has(value)) {
            keep.add(value);
            used = width.get(value) ?? 0;
        }
        for (const id of order) {
            if (keep.has(id))
                continue;
            const w = width.get(id) ?? 0;
            if (used + w > budget)
                break; // this one and every tab after it collapse into the menu
            used += w;
            keep.add(id);
        }
        for (const id of order)
            if (!keep.has(id))
                btns.get(id).classList.add("ds-tab--overflow");
    }
    function reflow() {
        if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
        measure();
    }
    function relayout() {
        if (!raf)
            raf = requestAnimationFrame(() => { raf = 0; measure(); });
    }
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => relayout()) : null;
    ro?.observe(root);
    apply();
    return handle(root, {
        getValue: () => value,
        setValue: (v) => { value = v; apply(); },
        select,
        setChip: (id, text) => {
            const c = chips.get(id);
            if (!c)
                return;
            c.textContent = String(text);
            relayout(); // a wider count can push the last tab out of the strip
        },
        setDisabled: (id, d, tip) => {
            const b = btns.get(id);
            if (!b)
                return;
            d ? disabled.add(id) : disabled.delete(id);
            b.classList.toggle("ds-disabled", d);
            b.setAttribute("aria-disabled", String(d));
            if (d && tip)
                b.setAttribute("data-ds-tip", tip);
            else
                b.removeAttribute("data-ds-tip");
        },
        addTab: (tab) => { build(norm(tab)); apply(); },
        removeTab,
        ids: () => order.slice(),
        reflow,
        panel: (id) => panels.get(id),
        destroy: () => {
            if (raf)
                cancelAnimationFrame(raf);
            ro?.disconnect();
            menu.destroy(); // the … menu lives on document.body, out of root.remove()'s reach
            root.remove();
        },
    });
}
