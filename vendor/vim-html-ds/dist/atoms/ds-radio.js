import { el, handle } from "../dom.js";
export function createRadio(host, opts = {}) {
    const norm = (o) => (typeof o === "string" ? { id: o, label: o } : o);
    const options = (opts.options ?? []).map(norm);
    let value = opts.value ?? null;
    const root = el("div", "ds-radiogroup" + (opts.direction === "row" ? " ds-radiogroup--row" : ""));
    const btns = new Map();
    const apply = () => { for (const [id, b] of btns)
        b.classList.toggle("ds-on", id === value); };
    for (const o of options) {
        const b = el("button", "ds-radio");
        b.type = "button";
        b.appendChild(el("span", "ds-radio__box"));
        b.appendChild(document.createTextNode(o.label));
        if (o.disabled)
            b.classList.add("ds-disabled");
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
    });
}
