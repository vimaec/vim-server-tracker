import { el, handle } from "../dom.js";
export function createSlider(host, opts = {}) {
    const root = el("input", "ds-slider");
    root.type = "range";
    root.min = String(opts.min ?? 0);
    root.max = String(opts.max ?? 100);
    if (opts.step != null)
        root.step = String(opts.step);
    root.value = String(opts.value ?? root.min);
    if (opts.disabled)
        root.disabled = true;
    if (opts.onInput)
        root.addEventListener("input", () => opts.onInput(Number(root.value)));
    if (opts.onChange)
        root.addEventListener("change", () => opts.onChange(Number(root.value)));
    host.appendChild(root);
    return handle(root, {
        getValue: () => Number(root.value),
        setValue: (v) => { root.value = String(v); },
        setDisabled: (d) => { root.disabled = !!d; },
    });
}
