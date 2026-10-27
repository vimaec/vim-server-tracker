import { el, handle } from "../dom.js";
import { createSearch } from "../atoms/ds-search.js";
import { createSegmented } from "../atoms/ds-segmented.js";
import { createButton } from "../atoms/ds-button.js";
export function createToolbar(host, opts = {}) {
    const root = el("div", "ds-toolbar");
    host.appendChild(root);
    const out = { search: null, segmented: null, actions: [] };
    if (opts.search)
        out.search = createSearch(root, opts.search);
    if (opts.segmented)
        out.segmented = createSegmented(root, opts.segmented);
    root.appendChild(el("span", "ds-toolbar__spacer"));
    for (const a of opts.actions ?? [])
        out.actions.push(createButton(root, a));
    return handle(root, out);
}
