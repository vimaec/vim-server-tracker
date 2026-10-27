import { el, handle } from "../dom.js";
import { DS_TIP_ATTR } from "./ds-tooltip.js";
export function createPathChip(host, opts = {}) {
    const root = el("div", "ds-pathchip");
    const icon = el("span", "ds-pathchip__icon");
    const span = el("span", "ds-pathchip__path");
    const set = (p) => {
        span.textContent = "\u200E" + (p ?? "");
        root.setAttribute(DS_TIP_ATTR, p ?? "");
    };
    set(opts.path);
    // stopPropagation: a path chip lives inside clickable rows/cards (a thumb card's whole body opens
    // the project) — clicking the path must reveal in Explorer ONLY, not also trigger the card's open.
    if (opts.onOpen) {
        root.style.cursor = "pointer";
        root.addEventListener("click", (e) => { e.stopPropagation(); opts.onOpen(span.textContent.slice(1)); });
    }
    root.append(icon, span);
    host.appendChild(root);
    return handle(root, { setPath: set });
}
