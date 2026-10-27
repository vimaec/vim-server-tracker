import { el, handle } from "../dom.js";
export function createIcon(host, opts = {}) {
    const root = el("span", "ds-icon" + (opts.size && opts.size !== "md" ? " ds-icon--" + opts.size : "") + (opts.filled ? " ds-icon--filled" : ""), opts.glyph ?? "");
    if (opts.tone)
        root.style.color = `var(--${opts.tone})`;
    host.appendChild(root);
    return handle(root, { setGlyph: (g) => { root.textContent = g; } });
}
