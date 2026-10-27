import { el, handle } from "../dom.js";
import { openDatePicker } from "./ds-datepicker.js";
export function createDateField(host, opts = {}) {
    const root = el("div", "ds-datefield");
    const input = el("input", "ds-input--inline ds-datefield__input");
    input.type = "text";
    input.placeholder = opts.placeholder ?? "yyyy-mm-dd";
    input.value = opts.value ?? "";
    const btn = el("button", "ds-iconbtn ds-dp-open", "\u{1F4C5}");
    btn.type = "button";
    root.append(input, btn);
    host.appendChild(root);
    let committed = opts.value ?? "";
    const valid = (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v);
    const commit = (v) => {
        input.classList.remove("ds-invalid");
        if (v === committed) {
            input.value = v;
            return;
        }
        committed = v;
        input.value = v;
        opts.onChange?.(v);
    };
    input.addEventListener("change", () => {
        const v = input.value.trim();
        if (valid(v))
            commit(v);
        else
            input.classList.add("ds-invalid"); // committed stays; the red mark says why
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
    } });
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openDatePicker(btn, {
            value: committed,
            yearMin: opts.yearMin,
            yearMax: opts.yearMax,
            onCommit: (iso) => commit(iso),
        });
    });
    if (opts.disabled) {
        input.disabled = true;
        btn.disabled = true;
    }
    return handle(root, {
        getValue: () => committed,
        setValue: (v) => { committed = v ?? ""; input.value = committed; input.classList.remove("ds-invalid"); },
        setDisabled: (d) => { input.disabled = d; btn.disabled = d; },
    });
}
