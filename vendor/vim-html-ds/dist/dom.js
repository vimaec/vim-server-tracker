// VIM Flex DS — shared DOM micro-helper. Internal: not re-exported by the barrel.
export function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className)
        n.className = className;
    if (text != null)
        n.textContent = text;
    return n;
}
export function childScope() {
    let kids = [];
    return {
        track: (child) => { kids.push(child); return child; },
        disposeAll: () => { for (const k of kids)
            k.destroy(); kids = []; },
    };
}
// Roving-tabindex arrow-key navigation over the items matching `itemSelector` inside a STABLE
// container (one that survives re-renders). Call it after each (re)render: it makes exactly one item
// tabbable and wires the ↑/↓ handler once. Keeps keyboard nav consistent across list/table/etc.
export function rovingFocus(container, itemSelector) {
    const items = () => Array.from(container.querySelectorAll(itemSelector));
    const list = items();
    list.forEach((it, i) => { it.tabIndex = i === 0 ? 0 : -1; });
    if (container.dataset.dsRoving)
        return;
    container.dataset.dsRoving = "1";
    container.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp")
            return;
        const cur = items();
        if (!cur.length)
            return;
        let idx = cur.indexOf(document.activeElement);
        idx = idx < 0 ? 0 : e.key === "ArrowDown" ? Math.min(cur.length - 1, idx + 1) : Math.max(0, idx - 1);
        e.preventDefault();
        cur.forEach((it, i) => { it.tabIndex = i === idx ? 0 : -1; });
        cur[idx]?.focus();
    });
}
/** A field's length cap from its option: a finite value of at least 1 (floored), Infinity for no
 *  cap at all, and the default for anything else (undefined, NaN, zero, negative). */
export function lengthCap(requested, fallback) {
    if (requested === Infinity)
        return Infinity;
    return Number.isFinite(requested) && requested >= 1 ? Math.floor(requested) : fallback;
}
/** Apply a cap to a text control: the HTML maxlength (bounds a paste), or none for Infinity. */
export function applyLengthCap(field, cap) {
    if (cap !== Infinity)
        field.maxLength = cap;
    return (v) => (v.length > cap ? v.slice(0, cap) : v);
}
export function handle(root, extra) {
    // defineProperties, not Object.assign: accessor members must survive as accessors — a handle
    // may expose a lazy getter (e.g. ds-panel's foot, hidden until first read).
    const base = {
        el: root,
        destroy: () => root.remove(),
        setVisible: (v) => { root.style.display = v ? "" : "none"; },
    };
    return Object.defineProperties(base, Object.getOwnPropertyDescriptors(extra));
}
// Dismiss-on-click-outside: fire cb on the first pointerdown that lands OUTSIDE every element in
// `within`, then unbind. Capture-phase, so a click a popover's content swallows still counts as
// inside, and one whose target is later removed from the DOM still dismisses. Returns an unbinder for
// the paths that close some other way (a Done button, Escape) — every consumer has one, which is why
// hand-rolled copies kept leaking the listener.
// OSR dismissal: a press over the 3D viewport never reaches the page (the compositor routes input
// by composited pixel alpha, and popup backdrops are TRANSPARENT — no screen tinting), so the host
// announces such presses by calling window.__vimFlexDismissMenus in every frame. Every open popup
// (menu, date picker, colour picker) registers here so that broadcast closes it; in-page
// click-away still works through backdrops/onClickOutside (DOM hit-testing ignores alpha).
// Outside OSR (the gallery, a plain browser) the hook simply never fires. Chained, not replaced:
// a host page may already have its own.
const dismissables = new Set();
if (typeof window !== "undefined") {
    const w = window;
    const prev = w.__vimFlexDismissMenus;
    w.__vimFlexDismissMenus = () => { prev?.(); [...dismissables].forEach((close) => close()); };
}
/** Register a popup's close with the OSR dismiss broadcast; returns the unregister. */
export function registerDismissable(close) {
    dismissables.add(close);
    return () => { dismissables.delete(close); };
}
export function onClickOutside(within, cb) {
    const onDown = (e) => {
        if (within.some((w) => w.contains(e.target)))
            return;
        unbind();
        cb();
    };
    const unbind = () => document.removeEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerdown", onDown, true);
    return unbind;
}
// Insertion index for a pointer at `y` given each item's vertical midpoint — the count of items
// whose midpoint sits above the pointer. Pure (the testable core of drag-reorder).
export function dropIndex(mids, y) {
    let i = 0;
    for (const m of mids) {
        if (y > m)
            i++;
        else
            break;
    }
    return i;
}
// Drag-to-reorder over a container's items. Envelope-compliant: NO setPointerCapture — the drag
// tracks `document` (OSR drops capture). onReorder gives the post-removal target index; a no-op drop
// (same slot) fires nothing. Returns a teardown. `.ds-dragging` marks the picked row, `.ds-drop` the
// live target.
export function reorderable(container, opts) {
    const items = () => Array.from(container.querySelectorAll(opts.itemSelector));
    const mids = () => items().map((it) => { const r = it.getBoundingClientRect(); return r.top + r.height / 2; });
    let from = -1;
    const clearMarks = () => items().forEach((it) => it.classList.remove("ds-dragging", "ds-drop"));
    const onMove = (e) => {
        const to = dropIndex(mids(), e.clientY);
        items().forEach((it, i) => it.classList.toggle("ds-drop", i === to && i !== from && i !== from + 1));
    };
    const onUp = (e) => {
        document.removeEventListener("pointermove", onMove);
        const to = dropIndex(mids(), e.clientY);
        clearMarks();
        if (from >= 0 && to !== from && to !== from + 1)
            opts.onReorder(from, to > from ? to - 1 : to);
        from = -1;
    };
    const onDown = (e) => {
        const t = e.target;
        if (opts.handleSelector && !t.closest(opts.handleSelector))
            return;
        const item = t.closest(opts.itemSelector);
        from = item ? items().indexOf(item) : -1;
        if (from < 0)
            return;
        e.preventDefault();
        item.classList.add("ds-dragging");
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp, { once: true });
    };
    container.addEventListener("pointerdown", onDown);
    return () => { container.removeEventListener("pointerdown", onDown); document.removeEventListener("pointermove", onMove); clearMarks(); };
}
// Absolute width for a column drag: the width at grab time plus the TOTAL pointer delta, clamped.
// Absolute, never incremental — a coalesced or dropped pointermove then costs nothing, because every
// frame recomputes the target from scratch instead of accumulating error. Pure (the testable core of
// column resize).
export function dragWidth(start, dx, min, max) {
    const w = Math.round(start + dx);
    return Math.max(min, max == null ? w : Math.min(max, w));
}
// A column-resize grip: a grabbable vertical rule for a header cell — same visual idiom as
// `.ds-split__handle`, which already resizes docked panels. Envelope-compliant: no setPointerCapture
// (OSR drops capture when the cursor leaves the element), so the drag tracks `document`.
//
// THE GEOMETRY RULE — the grab zone must contain the rule the user can SEE, and the only reliable
// way to guarantee that is to let ONE element own both. The grip paints its own hairline (::before,
// centred in the zone), so the line and the hit area cannot drift apart. Learned the expensive way
// in the CEF Estimation grid, where the visible rule was the NEIGHBOURING cell's border-left and the
// hit zone was measured from this cell's right edge: they ended up 3px apart, and the feature was
// completely dead to a human while every automated check passed. `.ds-split__handle` gets this right
// already by being its own 1px border; this is the same idea for a cell that can't be a flex item.
//
// A sortable header cell is also a button, so the whole mouse-event family is swallowed — otherwise
// a resize doubles as a re-sort and a double-click to reset sorts twice on its way through.
export function columnGrip(host, opts) {
    return sizeGrip("col", host, opts);
}
// columnGrip turned sideways: a grab bar that resizes a HEIGHT (a table's rows viewport, a docked
// band). Same options — min/max/startWidth/onResize speak px of height here — and the same keyboard
// twin, on ↑/↓. `anchor` does not apply: the bar is its own full-width element.
export function rowGrip(host, opts) {
    return sizeGrip("row", host, opts);
}
function sizeGrip(axis, host, opts) {
    const isCol = axis === "col";
    const grip = el("span", isCol ? "ds-colgrip ds-colgrip--" + (opts.anchor ?? "right") : "ds-rowgrip");
    const cursor = isCol ? "col-resize" : "row-resize";
    const min = opts.min ?? 48;
    const step = opts.step ?? 8;
    // A focusable separator is the WAI-ARIA splitter pattern, and it is the ONLY way to resize without
    // a mouse — the drag alone leaves the feature keyboard-dead. Each grip is its own tab stop, which
    // is the accepted cost of the pattern (a roving tabindex would need the arrow keys this uses).
    grip.setAttribute("role", "separator");
    // The ARIA orientation names the SEPARATOR, not the motion: a vertical rule resizes widths, a
    // horizontal bar resizes heights.
    grip.setAttribute("aria-orientation", isCol ? "vertical" : "horizontal");
    grip.setAttribute("aria-valuemin", String(min));
    if (opts.max != null)
        grip.setAttribute("aria-valuemax", String(opts.max));
    if (opts.label)
        grip.setAttribute("aria-label", opts.label);
    grip.tabIndex = 0;
    let start = 0, startW = 0, next = 0, raf = 0, dragging = false;
    let dragMax = opts.max; // resolved from maxOf at each drag start / keypress
    // A size already PAST the ceiling (a restored layout, a shrunken window) may stay and shrink —
    // never grow. Clamping it to the ceiling on the first touch would snap the layout under the
    // pointer, so the effective ceiling is never below where the drag starts.
    const resolveMax = () => {
        const m = opts.maxOf ? opts.maxOf() : opts.max;
        dragMax = m == null ? undefined : Math.max(m, opts.startWidth());
    };
    // Every size the component reports also lands on aria-valuenow, so a screen reader tracks the
    // drag and the arrow keys alike.
    const report = (w) => { grip.setAttribute("aria-valuenow", String(w)); opts.onResize(w); };
    const flush = () => { raf = 0; report(next); };
    const sign = opts.invert ? -1 : 1;
    const onMove = (e) => {
        next = dragWidth(startW, sign * ((isCol ? e.clientX : e.clientY) - start), min, dragMax);
        if (!raf)
            raf = requestAnimationFrame(flush);
    };
    const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
        if (dragging)
            report(next); // land on the exact drop size, never a dropped frame's
        dragging = false;
        grip.classList.remove("ds-active");
        document.body.style.cursor = "";
    };
    // Arrows resize (Shift = 4× bites), Home resets — the keyboard twin of drag and double-click.
    // startWidth() is re-read per keypress, so a column sized by content steps from its real width.
    const onKey = (e) => {
        if (e.key === "Home") {
            e.preventDefault();
            e.stopPropagation();
            opts.onReset?.();
            return;
        }
        const dir = isCol
            ? (e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0)
            : (e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0);
        if (!dir)
            return;
        e.preventDefault();
        e.stopPropagation(); // a header strip's own key handling must not also see this
        resolveMax();
        report(dragWidth(opts.startWidth(), sign * dir * step * (e.shiftKey ? 4 : 1), min, dragMax));
    };
    const onDown = (e) => {
        if (e.button !== 0)
            return;
        e.preventDefault();
        e.stopPropagation();
        dragging = true;
        start = isCol ? e.clientX : e.clientY;
        startW = next = opts.startWidth();
        resolveMax();
        grip.classList.add("ds-active");
        document.body.style.cursor = cursor;
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp, { once: true });
    };
    const swallow = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); };
    grip.addEventListener("pointerdown", onDown);
    grip.addEventListener("keydown", onKey);
    for (const type of ["mousedown", "mouseup", "click"])
        grip.addEventListener(type, swallow);
    grip.addEventListener("dblclick", (e) => { swallow(e); opts.onReset?.(); });
    host.appendChild(grip);
    return () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
        // Teardown can land MID-DRAG — a render() (setRows from an async query, say) disposes the grips
        // while the pointer is still down. Unwind the drag, or the body keeps the col-resize cursor for
        // good and the still-pending pointerup reports a width the user never committed.
        if (dragging) {
            dragging = false;
            document.body.style.cursor = "";
        }
        grip.remove();
    };
}
// Clamp a fixed-position popup inside the viewport (OSR windows are the viewport).
export function clampFixed(node, x, y, pad = 8) {
    const r = node.getBoundingClientRect();
    node.style.left = Math.max(pad, Math.min(x, innerWidth - r.width - pad)) + "px";
    node.style.top = Math.max(pad, Math.min(y, innerHeight - r.height - pad)) + "px";
}
