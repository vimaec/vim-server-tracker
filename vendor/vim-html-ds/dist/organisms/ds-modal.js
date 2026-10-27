import { el, handle } from "../dom.js";
// Overlay dialog — mounts to document.body (no host). Head / body / foot slots. Foot order: the
// dismissing button (Cancel / Close) first, the primary action LAST, so it lands bottom-right.
// Closes on backdrop press (unless closeOnBackdrop is false), ×, and Esc (all = onCancel path, never
// confirm) unless it is not dismissible. Focus is trapped inside while open and restored to the
// opener on close (role=dialog + aria-modal).
export function createModal(opts = {}) {
    const backdrop = el("div", "ds-modal-backdrop");
    const root = el("div", "ds-modal" + (opts.variant === "confirm" ? " ds-modal--confirm" : "")
        + (opts.size ? " ds-modal--" + opts.size : ""));
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.tabIndex = -1;
    if (opts.title)
        root.setAttribute("aria-label", opts.title);
    const head = el("div", "ds-modal__head");
    head.appendChild(el("div", "ds-modal__title", opts.title ?? ""));
    const dismissible = opts.dismissible !== false;
    const x = el("button", "ds-modal__close", ""); // the icon font's Dismiss glyph
    x.type = "button";
    x.setAttribute("aria-label", "Close");
    if (dismissible)
        head.appendChild(x);
    const body = el("div", "ds-modal__body");
    const foot = el("div", "ds-modal__foot");
    root.append(head, body, foot);
    backdrop.appendChild(root);
    document.body.appendChild(backdrop);
    const isOpen = () => backdrop.classList.contains("ds-open");
    const focusables = () => Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter((e) => !e.hasAttribute("disabled"));
    let opener = null;
    // No-op when already closed, so onClose fires exactly once per open.
    const close = () => {
        if (!isOpen())
            return;
        backdrop.classList.remove("ds-open");
        opts.onClose?.();
        opener?.focus?.();
        opener = null;
    };
    const open = () => {
        if (isOpen())
            return;
        opener = document.activeElement;
        backdrop.classList.add("ds-open");
        // The first control that is not the ×: focus parked on the × reads as a bordered button, and a
        // stray Enter would close the dialog.
        (focusables().find((e) => e !== x) ?? root).focus();
    };
    x.addEventListener("click", close);
    if (opts.closeOnBackdrop !== false)
        backdrop.addEventListener("mousedown", (e) => { if (dismissible && e.target === backdrop)
            close(); });
    const onKey = (e) => { if (dismissible && e.key === "Escape" && isOpen())
        close(); };
    document.addEventListener("keydown", onKey);
    // Focus trap: keep Tab cycling within the dialog.
    root.addEventListener("keydown", (e) => {
        if (e.key !== "Tab")
            return;
        const f = focusables();
        if (f.length === 0) {
            e.preventDefault();
            return;
        }
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });
    const h = handle(root, {
        body, foot, open, close,
        setTitle: (t) => { head.querySelector(".ds-modal__title").textContent = t; root.setAttribute("aria-label", t); },
        destroy: () => { document.removeEventListener("keydown", onKey); backdrop.remove(); },
    });
    return h;
}
