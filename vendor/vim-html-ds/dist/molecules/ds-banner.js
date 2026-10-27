import { el, handle } from "../dom.js";
import { createButton } from "../atoms/ds-button.js";
export function createBanner(host, opts = {}) {
    const root = el("div", "ds-banner" + (opts.tone && opts.tone !== "info" ? " ds-banner--" + opts.tone : ""));
    const msg = el("span", "ds-banner__msg", opts.text ?? "");
    root.appendChild(msg);
    if (opts.action)
        createButton(root, opts.action); // a standard control: the banner's padding tightens around it
    if (opts.dismissible) {
        const x = el("button", "ds-banner__close", "×");
        x.type = "button";
        x.setAttribute("aria-label", "Dismiss");
        x.addEventListener("click", () => { root.remove(); opts.onClose?.(); });
        root.appendChild(x);
    }
    host.appendChild(root);
    return handle(root, { setText: (t) => { msg.textContent = t; } });
}
