import { el, handle } from "../dom.js";
import { createIconButton } from "../atoms/ds-icon-button.js";
export function createSetting(host, opts = {}) {
    const root = el("div", "ds-setting");
    const label = el("span", "ds-setting__label", opts.label ?? "");
    const cell = el("div");
    root.append(label, cell);
    const reset = opts.onReset
        ? createIconButton(root, { icon: "eraser", tip: "Reset to default", onClick: () => opts.onReset?.() })
        : null;
    if (opts.help)
        root.appendChild(el("span", "ds-setting__help", opts.help));
    host.appendChild(root);
    const setModified = (m) => { reset?.setDisabled(!m); };
    setModified(!!opts.modified);
    opts.control?.(cell);
    return handle(root, { control: cell, setModified });
}
