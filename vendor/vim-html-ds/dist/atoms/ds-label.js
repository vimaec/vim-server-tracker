import { el, handle } from "../dom.js";
export function createLabel(host, opts = {}) {
    const root = el("span", "ds-label" + (opts.variant ? " ds-label--" + opts.variant : "")
        + (opts.truncate ? " ds-label--truncate" : ""), opts.text ?? "");
    host.appendChild(root);
    return handle(root, { setText: (t) => { root.textContent = t; } });
}
