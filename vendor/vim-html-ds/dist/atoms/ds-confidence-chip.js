import { el, handle } from "../dom.js";
const LETTER = { high: "H", med: "M", low: "L", excluded: "–" };
export function createConfidenceChip(host, opts = {}) {
    const root = el("span", "");
    const apply = (tier) => {
        root.className = "ds-conf ds-conf--" + tier;
        root.textContent = LETTER[tier] ?? "?";
    };
    apply(opts.tier ?? "med");
    host.appendChild(root);
    return handle(root, { setTier: apply });
}
