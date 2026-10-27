import { el, handle, applyLengthCap, lengthCap } from "../dom.js";
// Text field. variant: "mono" | "inline" (bare underline edit-in-place).
// Every field has a length CAP (the HTML maxlength, which also bounds a paste), defaulting to
// DEFAULT_INPUT_MAX: a text field that accepts megabytes breaks whatever consumes it (a name in a
// button, a value in a query). Name-shaped fields should pass a tighter one; pass a larger one only
// for a field that genuinely holds long text.
export const DEFAULT_INPUT_MAX = 1000;
export function createInput(host, opts = {}) {
    const cls = opts.variant === "inline" ? "ds-input--inline"
        : "ds-input" + (opts.variant === "mono" ? " ds-input--mono" : "");
    const root = el("input", cls);
    root.type = opts.type ?? "text";
    const clamp = applyLengthCap(root, lengthCap(opts.maxLength, DEFAULT_INPUT_MAX));
    if (opts.placeholder)
        root.placeholder = opts.placeholder;
    if (opts.value != null)
        root.value = clamp(opts.value);
    if (opts.readonly)
        root.readOnly = true;
    if (opts.disabled)
        root.disabled = true;
    if (opts.onInput)
        root.addEventListener("input", () => opts.onInput(root.value));
    if (opts.onChange)
        root.addEventListener("change", () => opts.onChange(root.value));
    host.appendChild(root);
    return handle(root, {
        getValue: () => root.value,
        setValue: (v) => { root.value = clamp(v); }, // programmatic writes obey the cap too
        focus: () => root.focus(),
        setDisabled: (d) => { root.disabled = !!d; },
    });
}
