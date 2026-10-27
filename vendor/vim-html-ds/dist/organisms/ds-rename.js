import { createModal } from "./ds-modal.js";
import { createButton } from "../atoms/ds-button.js";
import { createField } from "../molecules/ds-field.js";
import { createInput } from "../atoms/ds-input.js";
// Single-input modal. Opens with the current name selected; Enter = confirm, Esc = cancel;
// validate(value) → error string | null gates the primary and drives the field error.
export function createRename(opts = {}) {
    // Committing also closes the modal, and closing fires onClose — the flag keeps that close from
    // reading as a cancel. Exactly one of onCancel/onConfirm fires per interaction.
    let confirming = false;
    const m = createModal({ title: opts.title ?? "Rename", variant: "confirm", onClose: () => { if (!confirming)
            opts.onCancel?.(); } });
    const field = createField(m.body, { label: opts.label ?? "Name" });
    let primary;
    const input = createInput(field.body, {
        value: opts.value ?? "",
        onInput: (v) => {
            const err = opts.validate?.(v) ?? null;
            field.setError(err);
            primary.setDisabled(!!err || (!opts.allowEmpty && !v.trim()));
        },
    });
    const commit = () => {
        const v = input.getValue().trim();
        if ((!opts.allowEmpty && !v) || opts.validate?.(v))
            return;
        confirming = true;
        m.close();
        confirming = false;
        opts.onConfirm?.(v);
    };
    createButton(m.foot, { label: "Cancel", variant: "ghost", onClick: () => m.close() });
    primary = createButton(m.foot, { label: opts.confirmLabel ?? "Rename", variant: "primary", onClick: commit });
    input.el.addEventListener("keydown", (e) => { if (e.key === "Enter") {
        e.preventDefault();
        commit();
    } });
    const openBase = m.open;
    m.open = () => { openBase(); input.focus(); input.el.select(); };
    return m;
}
