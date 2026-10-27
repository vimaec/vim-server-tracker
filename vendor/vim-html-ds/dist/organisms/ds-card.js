import { el, handle } from "../dom.js";
import { createStat } from "../molecules/ds-stat.js";
// Flat panel + keyline header + body slot. keyline: false via variant "no-keyline".
export function createCard(host, opts = {}) {
    const root = el("div", "ds-card" + (opts.keyline === false ? " ds-card--no-keyline" : ""));
    let actions = null, body = el("div", "ds-card__body");
    if (opts.title || opts.sub) {
        const head = el("div", "ds-card__head");
        const titles = el("div", "ds-card__titles");
        titles.appendChild(el("span", "ds-label ds-label--title", opts.title ?? ""));
        if (opts.sub)
            titles.appendChild(el("span", "ds-card__sub", opts.sub));
        actions = el("div", "ds-card__actions");
        head.append(titles, actions);
        root.appendChild(head);
    }
    root.appendChild(body);
    host.appendChild(root);
    return handle(root, {
        body,
        actions,
        statBand: () => { const b = el("div", "ds-stat-band"); body.appendChild(b); return b; },
        addStat: (band, statOpts) => createStat(band, statOpts),
    });
}
