import { el, handle, applyLengthCap, lengthCap } from "../dom.js";
// Every text area has a length CAP (the HTML maxlength; a paste is bounded too), defaulting to
// DEFAULT_TEXTAREA_MAX — a note, not a document. A field that holds a whole file passes its own.
export const DEFAULT_TEXTAREA_MAX = 20000;
export function createTextarea(host, opts = {}) {
    const root = el("textarea", "ds-textarea");
    const clamp = applyLengthCap(root, lengthCap(opts.maxLength, DEFAULT_TEXTAREA_MAX));
    if (opts.placeholder)
        root.placeholder = opts.placeholder;
    if (opts.rows)
        root.rows = opts.rows;
    if (opts.value != null)
        root.value = clamp(opts.value);
    if (opts.disabled)
        root.disabled = true;
    if (opts.onInput)
        root.addEventListener("input", () => opts.onInput(root.value));
    if (opts.onChange)
        root.addEventListener("change", () => opts.onChange(root.value));
    host.appendChild(root);
    return handle(root, {
        getValue: () => root.value,
        setValue: (v) => { root.value = clamp(v); },
        setDisabled: (d) => { root.disabled = !!d; },
    });
}
