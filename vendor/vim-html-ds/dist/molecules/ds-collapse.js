import { el, handle, rowGrip } from "../dom.js";
import { createIcon } from "../atoms/ds-icon.js";
export function createCollapse(host, opts = {}) {
    const root = el("div", "ds-collapse" + (opts.accent ? " ds-collapse--accent" : "")
        + (opts.heightResizable ? " ds-collapse--resizable" : "") + (opts.open === false ? " ds-closed" : ""));
    const head = el("button", "ds-collapse__head");
    head.type = "button";
    head.appendChild(el("span", "ds-tree__caret"));
    if (opts.icon)
        createIcon(head, { glyph: opts.icon, size: "sm", tone: "text-400" });
    head.appendChild(document.createTextNode(opts.title ?? ""));
    const body = el("div", "ds-collapse__body");
    // An explicit height also lifts the resting 50% cap (see the CSS): the cap is there so a
    // content-heavy section cannot starve the pane above BY DEFAULT — a user's own drag outranks it.
    const applyH = (h) => {
        root.style.height = h == null ? "" : h + "px";
        root.style.maxHeight = h == null ? "" : "none";
    };
    if (opts.heightResizable) {
        // The bar goes in FIRST: it is the boundary between this section and whatever sits above it.
        const barHost = el("div", "ds-rowgrip-host");
        root.appendChild(barHost);
        rowGrip(barHost, {
            min: opts.minHeight ?? 80,
            maxOf: opts.maxHeightOf,
            invert: true, // bottom-docked: dragging the boundary UP grows the section
            label: "Resize " + (opts.title ?? "section"),
            startWidth: () => root.getBoundingClientRect().height,
            onResize: (h) => { applyH(h); opts.onHeightResize?.(h); },
            onReset: () => { applyH(null); opts.onHeightResize?.(null); },
        });
        // No explicit disposer: the grip's document listeners live only during a drag, and the bar
        // itself dies with the root on destroy.
    }
    root.append(head, body);
    head.addEventListener("click", () => {
        root.classList.toggle("ds-closed");
        opts.onToggle?.(!root.classList.contains("ds-closed"));
    });
    host.appendChild(root);
    return handle(root, {
        body,
        isOpen: () => !root.classList.contains("ds-closed"),
        toggle: (open) => root.classList.toggle("ds-closed", open === undefined ? undefined : !open),
        setHeight: applyH,
    });
}
