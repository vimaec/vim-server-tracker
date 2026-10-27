import { el } from "../dom.js";
import { createModal } from "./ds-modal.js";
import { createButton } from "../atoms/ds-button.js";
import { createInput } from "../atoms/ds-input.js";
// Two-action confirm — a createModal variant. Esc/backdrop/Cancel = onCancel, never confirm.
// destructive: true renders the confirm action as ds-btn--danger. requireText gates the confirm
// button behind an exact typed word (the "type DELETE to proceed" pattern).
// Ask, and await the answer: `if (await openConfirm({ title: "Delete?" })) …`.
//
// createConfirm BUILDS a dialog and the caller opens it; every consumer that only wants "did they
// agree?" then re-wraps its two callbacks into a promise. This is that wrapper, once. It also removes
// the trap in the two-step form: forgetting .open() leaves the backdrop in the DOM without ds-open,
// so nothing shows, neither callback ever fires, and an awaiting caller hangs forever — a delete
// button that looks dead. Use createConfirm directly only when you need the handle (showResult's
// per-item outcome report).
export function openConfirm(opts = {}) {
    return new Promise((resolve) => {
        createConfirm({ ...opts, onConfirm: () => resolve(true), onCancel: () => resolve(false) }).open();
    });
}
export function createConfirm(opts = {}) {
    // Confirming (and the result screen's Done) also closes the modal, and closing fires onClose —
    // the flag keeps those closes from reading as a cancel. onCancel fires only on a real dismissal.
    let confirming = false;
    const m = createModal({ title: opts.title, variant: "confirm", onClose: () => { if (!confirming)
            opts.onCancel?.(); } });
    m.body.appendChild(el("span", undefined, opts.text ?? ""));
    createButton(m.foot, { label: opts.cancelLabel ?? "Cancel", variant: "ghost", onClick: () => m.close() });
    const confirmBtn = createButton(m.foot, {
        label: opts.confirmLabel ?? "OK",
        variant: opts.destructive ? "danger" : "primary",
        disabled: !!opts.requireText,
        onClick: () => { confirming = true; m.close(); confirming = false; opts.onConfirm?.(); },
    });
    if (opts.requireText) {
        const gate = el("div", "ds-confirm__gate");
        createInput(gate, {
            placeholder: opts.requirePlaceholder ?? `Type ${opts.requireText} to confirm`,
            onInput: (v) => confirmBtn.setDisabled(v !== opts.requireText),
        });
        m.body.appendChild(gate);
    }
    const showResult = (items, doneLabel = "Done") => {
        m.body.textContent = "";
        const list = el("div", "ds-confirm__outcomes");
        for (const it of items) {
            const row = el("div", "ds-confirm__outcome");
            row.appendChild(el("span", "ds-dot " + (it.ok ? "ds-dot--good" : "ds-dot--bad")));
            row.appendChild(el("span", "ds-confirm__outcome-label", it.label));
            if (it.note)
                row.appendChild(el("span", "ds-confirm__outcome-note", it.note));
            list.appendChild(row);
        }
        m.body.appendChild(list);
        m.foot.textContent = "";
        createButton(m.foot, { label: doneLabel, variant: "primary", onClick: () => { confirming = true; m.close(); confirming = false; } });
    };
    return Object.assign(m, { showResult });
}
