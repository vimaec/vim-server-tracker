import { el, handle } from "../dom.js";
import { createButton } from "../atoms/ds-button.js";
export function createEmpty(host, opts = {}) {
    const box = el("div", "ds-empty");
    box.appendChild(el("div", "ds-empty__title", opts.title ?? ""));
    if (opts.hint)
        box.appendChild(el("div", "ds-empty__hint", opts.hint));
    if (opts.action)
        createButton(box, { variant: "ghost", ...opts.action });
    const root = opts.fill ? el("div", "ds-empty-fill") : box;
    if (opts.fill)
        root.appendChild(box);
    host.appendChild(root);
    return handle(root, {});
}
