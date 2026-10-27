import { el, handle } from "../dom.js";
export function createCheckbox(host, opts = {}) {
    let state = opts.state ?? "off";
    const root = el("button", "ds-check");
    root.type = "button";
    root.setAttribute("role", "checkbox");
    if (opts.label)
        root.setAttribute("aria-label", opts.label);
    root.appendChild(el("span", "ds-check__box"));
    if (opts.label)
        root.appendChild(el("span", undefined, opts.label));
    if (opts.disabled)
        root.classList.add("ds-disabled");
    const apply = () => {
        root.classList.toggle("ds-on", state === "on");
        root.classList.toggle("ds-partial", state === "partial");
        root.setAttribute("aria-checked", state === "on" ? "true" : state === "partial" ? "mixed" : "false");
    };
    root.addEventListener("click", () => {
        state = state === "off" ? "on" : state === "partial" ? "on" : "off";
        apply();
        opts.onChange?.(state);
    });
    apply();
    host.appendChild(root);
    return handle(root, {
        getState: () => state,
        setState: (s) => { state = s; apply(); },
        setDisabled: (d) => root.classList.toggle("ds-disabled", !!d),
    });
}
