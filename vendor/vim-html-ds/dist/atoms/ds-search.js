import { el, handle, applyLengthCap, lengthCap } from "../dom.js";
import { DS_TIP_ATTR } from "./ds-tooltip.js";
export const DEFAULT_SEARCH_MAX = 200;
export function createSearch(host, opts = {}) {
    const root = el("div", "ds-search");
    const submit = opts.onSubmit;
    const icon = submit ? el("button", "ds-search__icon ds-search__icon--go") : el("span", "ds-search__icon");
    const input = el("input", "ds-input");
    input.type = "text";
    const clamp = applyLengthCap(input, lengthCap(opts.maxLength, DEFAULT_SEARCH_MAX));
    input.placeholder = opts.placeholder ?? "Search…";
    if (opts.value != null)
        input.value = clamp(opts.value);
    const clear = el("button", "ds-search__clear", "×");
    clear.type = "button";
    const sync = () => clear.classList.toggle("ds-show", input.value.length > 0);
    input.addEventListener("input", () => { sync(); opts.onInput?.(input.value); });
    clear.addEventListener("click", () => { input.value = ""; sync(); opts.onInput?.(""); submit?.(""); input.focus(); });
    if (submit && icon instanceof HTMLButtonElement) {
        icon.type = "button";
        icon.setAttribute("aria-label", "Search");
        icon.setAttribute(DS_TIP_ATTR, "Search (Enter)");
        icon.addEventListener("click", () => { submit(input.value); input.focus(); });
        input.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" || e.isComposing)
                return; // an IME still composing owns its Enter
            e.preventDefault();
            submit(input.value);
        });
    }
    root.append(icon, input, clear);
    sync();
    host.appendChild(root);
    return handle(root, {
        getValue: () => input.value,
        setValue: (v) => { input.value = clamp(v); sync(); },
        focus: () => input.focus(),
    });
}
