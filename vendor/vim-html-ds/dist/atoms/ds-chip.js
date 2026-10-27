import { el, handle } from "../dom.js";
export function createChip(host, opts = {}) {
    const cls = (tone) => "ds-chip" + (tone ? " ds-chip--" + tone : "") + (opts.onClick ? " ds-chip--clickable" : "");
    const root = el("span", cls(opts.tone), opts.text ?? "");
    if (opts.onClick) {
        root.setAttribute("role", "button");
        root.tabIndex = 0;
        root.addEventListener("click", opts.onClick);
        root.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            opts.onClick(e);
        } });
    }
    host.appendChild(root);
    return handle(root, {
        setText: (t) => { root.textContent = t; },
        setTone: (tone) => { root.className = cls(tone); },
    });
}
