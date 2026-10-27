import { el, handle } from "../dom.js";
export function createEditCell(host, opts = {}) {
    const fmt = (v) => (opts.format === "int" ? String(Math.round(v)) : opts.format === "float" ? Number(v).toFixed(2) : String(v));
    let committed = opts.value ?? "";
    let state = opts.state ?? "clean";
    const root = el("span", "");
    root.style.display = "inline-flex";
    const input = el("input", "ds-input--inline");
    input.value = fmt(committed);
    const applyState = () => {
        root.classList.toggle("ds-pending", state === "pending");
        root.classList.toggle("ds-invalid", state === "invalid");
    };
    const setState = (s) => { state = s; applyState(); };
    const commit = () => {
        if (input.value === fmt(committed))
            return;
        const v = opts.format === "int" || opts.format === "float" ? parseFloat(input.value) || 0 : input.value;
        committed = v;
        input.value = fmt(v);
        opts.onEdit?.(v);
    };
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            commit();
            input.blur();
        }
        if (e.key === "Escape") {
            input.value = fmt(committed);
            setState("clean");
            input.blur();
        }
    });
    // Invalid is consumer-owned; typing only moves between clean and pending.
    input.addEventListener("input", () => { if (state !== "invalid")
        setState(input.value !== fmt(committed) ? "pending" : "clean"); });
    input.addEventListener("blur", commit);
    root.appendChild(input);
    host.appendChild(root);
    applyState();
    return handle(root, {
        getValue: () => committed,
        setValue: (v) => { committed = v; input.value = fmt(v); setState("clean"); },
        getState: () => state,
        setState,
    });
}
