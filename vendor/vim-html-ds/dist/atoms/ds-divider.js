import { el, handle } from "../dom.js";
export function createDivider(host, opts = {}) {
    let root;
    if (opts.label)
        root = el("div", "ds-divider ds-divider--label", opts.label);
    else
        root = el("div", "ds-divider " + (opts.vertical ? "ds-divider--v" : "ds-divider--h"));
    host.appendChild(root);
    return handle(root, {});
}
