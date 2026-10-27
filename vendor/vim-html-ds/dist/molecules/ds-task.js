import { el, handle } from "../dom.js";
import { createIconButton } from "../atoms/ds-icon-button.js";
export function createTask(host, opts = {}) {
    const root = el("div", "ds-task");
    const head = el("div", "ds-task__head");
    const label = el("span", "ds-task__label", opts.label ?? "");
    const pct = el("span", "ds-task__pct", "0%");
    head.append(label, pct);
    const cancel = opts.onCancel
        ? createIconButton(head, { icon: "clear", tip: "Cancel", onClick: () => opts.onCancel?.() })
        : null;
    const barWrap = el("div", "ds-bar");
    const fill = el("div", "ds-bar__fill");
    barWrap.appendChild(fill);
    root.append(head, barWrap);
    host.appendChild(root);
    const clearState = () => {
        root.classList.remove("ds-task--busy", "ds-task--bad");
        barWrap.className = "ds-bar";
        fill.style.width = "0%";
    };
    return handle(root, {
        setLabel: (t) => { label.textContent = t; },
        setProgress: (v01) => {
            clearState();
            const p = Math.round(Math.max(0, Math.min(1, v01)) * 100);
            fill.style.width = p + "%";
            pct.textContent = p + "%";
        },
        setBusy: () => {
            clearState();
            root.classList.add("ds-task--busy");
            fill.style.width = "";
            pct.textContent = "working…";
        },
        fail: (why) => {
            root.classList.remove("ds-task--busy");
            root.classList.add("ds-task--bad");
            barWrap.className = "ds-bar ds-bar--bad";
            pct.textContent = why ? "failed — " + why : "failed";
        },
        done: () => {
            clearState();
            fill.style.width = "100%";
            pct.textContent = "done";
            cancel?.setDisabled(true);
        },
    });
}
