import { el, handle } from "../dom.js";
export function createButton(host, opts = {}) {
    const root = el("button", "ds-btn" + (opts.variant ? " ds-btn--" + opts.variant : ""), opts.label ?? "");
    root.type = "button";
    if (opts.disabled)
        root.disabled = true;
    if (opts.onClick)
        root.addEventListener("click", opts.onClick);
    host.appendChild(root);
    return handle(root, {
        setLabel: (l) => { root.textContent = l; },
        setDisabled: (d) => { root.disabled = !!d; },
        setActive: (a) => root.classList.toggle("ds-active", !!a),
    });
}
