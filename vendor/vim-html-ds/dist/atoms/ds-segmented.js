import { el, handle } from "../dom.js";
export function createSegmented(host, opts = {}) {
    const norm = (o) => (typeof o === "string" ? { id: o, label: o } : o);
    const options = (opts.options ?? []).map(norm);
    let value = opts.value ?? options[0]?.id ?? null;
    const root = el("div", "ds-segmented");
    const btns = new Map();
    const apply = () => { for (const [id, b] of btns)
        b.classList.toggle("ds-active", id === value); };
    for (const o of options) {
        const b = el("button", "ds-seg", o.label);
        b.type = "button";
        b.addEventListener("click", () => { if (value !== o.id) {
            value = o.id;
            apply();
            opts.onChange?.(value);
        } });
        btns.set(o.id, b);
        root.appendChild(b);
    }
    apply();
    host.appendChild(root);
    return handle(root, {
        getValue: () => value,
        setValue: (v) => { value = v; apply(); },
        setDisabled: (d) => root.classList.toggle("ds-disabled", !!d),
    });
}
