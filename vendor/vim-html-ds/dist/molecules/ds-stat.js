import { el, handle } from "../dom.js";
import { createChip } from "../atoms/ds-chip.js";
export function createStat(host, opts = {}) {
    const root = el("div", "ds-stat");
    const label = el("span", "ds-label ds-label--eyebrow", opts.label ?? "");
    const row = el("div", "ds-stat__value-row");
    const value = el("span", "ds-stat__value", opts.value ?? "");
    row.appendChild(value);
    if (opts.unit)
        row.appendChild(el("span", "ds-stat__unit", opts.unit));
    // The delta chip is created lazily on the first non-empty setDelta: a card that never sets a delta
    // stays chip-free, and setDelta works whether or not the card was seeded with one.
    let delta = opts.delta ? createChip(row, { text: opts.delta, tone: opts.tone }) : null;
    root.append(label, row);
    host.appendChild(root);
    const setValue = (v) => { value.textContent = v; };
    const setDelta = (text, tone) => {
        if (!text) {
            if (delta)
                delta.el.style.display = "none";
            return;
        }
        if (!delta)
            delta = createChip(row, { text, tone });
        else {
            delta.setText(text);
            if (tone)
                delta.setTone(tone);
        }
        delta.el.style.display = "";
    };
    return handle(root, {
        setValue,
        setDelta,
        reset: () => { setValue(opts.value ?? ""); setDelta(opts.delta ?? "", opts.tone); },
    });
}
