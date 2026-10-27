import { el, handle } from "../dom.js";
// Drag-scrub geometry. A press that travels less than SCRUB_THRESHOLD_PX is still a click, so the
// button's own single step runs; past it the gesture is a scrub, and every SCRUB_QUANTUM_PX of
// vertical travel is worth one `step`.
const SCRUB_THRESHOLD_PX = 3;
const SCRUB_QUANTUM_PX = 4;
export function createNumberInput(host, opts = {}) {
    const min = opts.min ?? -Infinity, max = opts.max ?? Infinity, step = opts.step ?? 1;
    const stepDecimals = String(step).includes(".") ? String(step).split(".")[1].length : 0;
    const decimals = Number.isInteger(opts.decimals) && opts.decimals >= 0 ? Math.min(20, opts.decimals) : stepDecimals;
    const root = el("div", "ds-number");
    const input = el("input", "ds-number__input");
    input.value = opts.value != null ? Number(opts.value).toFixed(decimals) : "";
    // The last committed value: what a nudge steps from, and what junk text falls back to.
    let current = opts.value != null ? Number(opts.value) : 0;
    const btns = el("div", "ds-number__btns");
    const up = el("button", "ds-number__btn", "▴");
    const down = el("button", "ds-number__btn", "▾");
    up.type = down.type = "button";
    const clamp = (v) => Math.max(min, Math.min(max, v));
    const format = (v) => clamp(v).toFixed(decimals);
    const commit = (v) => {
        input.value = format(v);
        current = Number(input.value);
        opts.onChange?.(current);
    };
    const nudge = (dir) => commit(current + dir * step);
    up.addEventListener("click", () => nudge(1));
    down.addEventListener("click", () => nudge(-1));
    input.addEventListener("change", () => {
        const n = parseFloat(input.value);
        if (Number.isFinite(n))
            commit(n);
        else
            input.value = format(current); // junk: back to what it was, no commit
    });
    input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") {
            e.preventDefault();
            nudge(1);
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            nudge(-1);
        }
    });
    // The scrub. No setPointerCapture (OSR drops capture the moment the cursor leaves the element),
    // so the gesture tracks `document` and unwinds itself on release, on a cancelled pointer, on
    // Escape, and on destroy() — a listener left behind would keep driving a dead control.
    let startY = 0, startValue = 0, dragging = false, scrubbing = false, swallowClick = false;
    const onMove = (e) => {
        const dy = startY - e.clientY; // up is positive
        if (!scrubbing) {
            if (Math.abs(dy) < SCRUB_THRESHOLD_PX)
                return;
            scrubbing = true;
            root.classList.add("ds-number--scrub");
            document.body.style.cursor = "ns-resize";
        }
        // Absolute, never incremental: each tick recomputes from the value at grab time, so a coalesced
        // or dropped pointermove costs nothing instead of accumulating drift.
        const text = format(startValue + Math.trunc(dy / SCRUB_QUANTUM_PX) * step);
        if (text === input.value)
            return;
        input.value = text;
        opts.onInput?.(Number(input.value));
    };
    const unbind = () => {
        if (!dragging)
            return;
        dragging = scrubbing = false;
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onAbort);
        document.removeEventListener("keydown", onKey, true);
        root.classList.remove("ds-number--scrub");
        document.body.style.cursor = "";
    };
    const onUp = () => {
        const scrubbed = scrubbing;
        unbind();
        if (!scrubbed)
            return; // under the threshold the press is a click, and the button steps it
        swallowClick = true; // past it the release must not ALSO count as a click
        current = Number(input.value);
        opts.onChange?.(current);
    };
    // Escape, and a pointer the system takes away, abandon the gesture: back to the value at grab
    // time, reported as a preview, with no commit and no step from the click that follows the release.
    const onAbort = () => {
        if (!dragging)
            return;
        const restore = format(startValue);
        unbind();
        swallowClick = true;
        input.value = restore;
        opts.onInput?.(Number(input.value));
    };
    const onKey = (e) => {
        if (e.key !== "Escape" || !dragging)
            return;
        e.preventDefault();
        e.stopPropagation();
        onAbort();
    };
    btns.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || dragging)
            return;
        e.preventDefault(); // the scrub must not drag a text selection out behind it
        swallowClick = false;
        dragging = true;
        startY = e.clientY;
        startValue = current;
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
        document.addEventListener("pointercancel", onAbort);
        document.addEventListener("keydown", onKey, true);
    });
    // Capture on the stack, so the buttons' own click handlers never see the click a scrub ends with.
    btns.addEventListener("click", (e) => {
        if (!swallowClick)
            return;
        swallowClick = false;
        e.preventDefault();
        e.stopImmediatePropagation();
    }, true);
    btns.append(up, down);
    root.append(input, btns);
    if (opts.disabled)
        root.classList.add("ds-disabled");
    host.appendChild(root);
    return handle(root, {
        getValue: () => current,
        setValue: (v) => { input.value = format(v); current = Number(input.value); },
        setDisabled: (d) => root.classList.toggle("ds-disabled", !!d),
        destroy: () => { unbind(); root.remove(); },
    });
}
