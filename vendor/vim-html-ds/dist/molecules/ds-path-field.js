import { el, handle } from "../dom.js";
import { createInput } from "../atoms/ds-input.js";
import { createIconButton } from "../atoms/ds-icon-button.js";
export function createPathField(host, opts = {}) {
    const root = el("div", "ds-pathfield");
    host.appendChild(root);
    let value = opts.value ?? "";
    const input = createInput(root, { value, placeholder: opts.placeholder ?? "No path selected", readonly: true });
    const browse = createIconButton(root, { icon: "browse", tip: "Browse…", onClick: () => opts.onBrowse?.() });
    const explore = createIconButton(root, { icon: "folder", tip: "Open in explorer", onClick: () => opts.onExplore?.(value) });
    const reset = createIconButton(root, { icon: "eraser", tip: "Reset to default", onClick: () => {
            setValue(opts.defaultValue ?? "");
            opts.onReset?.(value);
        } });
    const sync = () => {
        explore.setDisabled(!value);
        reset.setDisabled(!value || value === (opts.defaultValue ?? ""));
    };
    const setValue = (v) => { value = v ?? ""; input.setValue(value); sync(); };
    sync();
    return handle(root, { getValue: () => value, setValue, browse, explore, reset });
}
