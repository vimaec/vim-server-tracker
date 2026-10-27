import { el, handle } from "../dom.js";
export function createBar(host, opts = {}) {
    const max = opts.max ?? 100;
    const root = el("div", "ds-bar" + (opts.tone && opts.tone !== "cyan" ? " ds-bar--" + opts.tone : ""));
    const fill = el("div", "ds-bar__fill");
    root.appendChild(fill);
    const set = (v) => { fill.style.width = Math.max(0, Math.min(100, (v / max) * 100)) + "%"; };
    set(opts.value ?? 0);
    host.appendChild(root);
    return handle(root, { setValue: set });
}
