import { el, handle } from "../dom.js";
import { createMenu } from "../molecules/ds-menu.js";
export function createSelect(host, opts = {}) {
    const norm = (o) => (typeof o === "string" ? { id: o, label: o } : o);
    let options = (opts.options ?? []).map(norm);
    let value = opts.value ?? null;
    let state = opts.state ?? "clean";
    const root = el("button", "ds-select" + (opts.block ? " ds-select--block" : ""));
    root.type = "button";
    const dot = el("span", "ds-seldot");
    const icon = el("span", "ds-selicon");
    const label = el("span", "ds-select__label");
    const hint = el("span", "ds-select__hint");
    const chev = el("span", "ds-select__chev");
    root.append(dot, icon, label, hint, chev);
    const sync = () => {
        const cur = options.find((o) => o.id === value);
        label.textContent = cur ? cur.label : (opts.placeholder ?? "Select…");
        label.classList.toggle("ds-placeholder", !cur);
        dot.style.display = cur && cur.dot ? "" : "none";
        if (cur && cur.dot)
            dot.style.background = cur.dot;
        icon.style.display = cur && cur.icon ? "" : "none";
        icon.textContent = cur && cur.icon ? cur.icon : "";
        icon.style.color = (cur && cur.iconColor) || "";
        hint.style.display = cur && cur.hint ? "" : "none";
        hint.textContent = cur && cur.hint ? cur.hint : "";
    };
    const applyState = () => {
        root.classList.toggle("ds-pending", state === "pending");
        root.classList.toggle("ds-invalid", state === "invalid");
    };
    const menu = createMenu({});
    root.addEventListener("click", () => {
        const entries = [];
        for (const o of options) {
            entries.push({
                label: o.label,
                dot: o.dot,
                icon: o.icon,
                iconColor: o.iconColor,
                hint: o.hint,
                selected: !o.action && o.id === value,
                onClick: o.action
                    ? () => o.action()
                    : () => { if (value !== o.id) {
                        value = o.id;
                        sync();
                        opts.onChange?.(value);
                    } },
            });
            if (o.separatorAfter)
                entries.push("separator");
        }
        menu.setItems(entries);
        root.classList.add("ds-open");
        menu.openUnder(root);
    });
    const obs = new MutationObserver(() => {
        if (!menu.el.classList.contains("ds-open"))
            root.classList.remove("ds-open");
    });
    obs.observe(menu.el, { attributes: true, attributeFilter: ["class"] });
    sync();
    applyState();
    host.appendChild(root);
    return handle(root, {
        getValue: () => value,
        setValue: (v) => { value = v; state = "clean"; sync(); applyState(); },
        setOptions: (next) => { options = next.map(norm); sync(); },
        setDisabled: (d) => root.classList.toggle("ds-disabled", !!d),
        getState: () => state,
        setState: (s) => { state = s; applyState(); },
        destroy: () => { obs.disconnect(); menu.destroy(); root.remove(); },
    });
}
