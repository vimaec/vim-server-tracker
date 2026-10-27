import { el, handle } from "../dom.js";
export function createField(host, opts = {}) {
    const root = el("div", "ds-formfield");
    const label = el("label", "ds-formfield__label", opts.label ?? "");
    if (opts.required)
        label.appendChild(el("span", "ds-formfield__req", "*"));
    const body = el("div");
    const help = el("span", "ds-formfield__help", opts.help ?? "");
    const error = el("span", "ds-formfield__error");
    root.append(label, body, help, error);
    if (!opts.help)
        help.style.display = "none";
    host.appendChild(root);
    return handle(root, {
        body,
        setError: (msg) => {
            root.classList.toggle("ds-invalid", !!msg);
            error.textContent = msg ?? "";
        },
    });
}
