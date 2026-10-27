import { el, handle } from "../dom.js";
export function createGroupBand(host, opts = {}) {
    const root = el("div", "ds-grpband");
    const text = document.createTextNode(`${opts.label ?? ""}${opts.count != null ? " · " + opts.count : ""} `);
    const sub = el("span", "ds-grp-sub", opts.subtotals ?? "");
    root.append(text, sub);
    if (opts.onToggle)
        root.addEventListener("click", () => opts.onToggle());
    host.appendChild(root);
    return handle(root, {
        setSubtotals: (s) => { sub.textContent = s; },
    });
}
