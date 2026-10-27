import { el, handle, columnGrip } from "../dom.js";
import { createIconButton } from "../atoms/ds-icon-button.js";
import { createLabel } from "../atoms/ds-label.js";
import { DS_TIP_ATTR } from "../atoms/ds-tooltip.js";
export function createPanes(host, opts) {
    const root = el("div", "ds-panes");
    const min = opts.minWidth ?? 160;
    const panes = [];
    const evenOut = () => { for (const p of panes)
        p.el.style.removeProperty("--ds-pane-w"); };
    for (const spec of opts.panes) {
        const pane = el("div", "ds-pane");
        const head = el("div", "ds-pane__head");
        const caret = createIconButton(head, {
            icon: "chevron-left", size: "sm", tip: "Collapse this pane", ariaLabel: "Collapse the " + spec.title + " pane",
            onClick: (ev) => { ev.stopPropagation(); setParked(true); },
        });
        caret.el.classList.add("ds-pane__park");
        const lead = el("span", "ds-pane__lead");
        // The lead's controls stay live in the strip: a press on them is theirs, never the strip's.
        lead.addEventListener("click", (ev) => ev.stopPropagation());
        const title = createLabel(head, { text: spec.title, variant: "eyebrow" });
        title.el.classList.add("ds-pane__title");
        if (spec.tone)
            title.el.style.color = "var(--" + spec.tone + ")";
        head.insertBefore(lead, title.el);
        const meta = el("span", "ds-pane__meta");
        const tools = el("span", "ds-pane__tools");
        tools.addEventListener("click", (ev) => ev.stopPropagation());
        head.append(meta, tools);
        const body = el("div", "ds-pane__body");
        pane.append(head, body);
        root.appendChild(pane);
        let tip = spec.tip ?? "";
        const paintTip = () => head.setAttribute(DS_TIP_ATTR, pane.classList.contains("ds-pane--parked")
            ? "Show the " + spec.title + " pane" : tip);
        const setParked = (on) => {
            if (pane.classList.contains("ds-pane--parked") === on)
                return;
            pane.classList.toggle("ds-pane--parked", on);
            paintTip();
            opts.onParkChange?.(spec.id, on);
        };
        if (opts.onHeadClick) {
            pane.classList.add("ds-pane--action");
            head.addEventListener("click", () => {
                if (pane.classList.contains("ds-pane--parked") || head.classList.contains("ds-pane__head--idle"))
                    return;
                opts.onHeadClick(spec.id);
            });
        }
        // Parked, the strip IS the control: a button inside it would be a 24px target in a 34px column.
        pane.addEventListener("click", () => { if (pane.classList.contains("ds-pane--parked"))
            setParked(false); });
        if (spec.parked)
            pane.classList.add("ds-pane--parked");
        paintTip();
        panes.push({
            id: spec.id, el: pane, head, lead, meta, tools, body,
            isParked: () => pane.classList.contains("ds-pane--parked"),
            setParked,
            setHeadActive: (on) => head.classList.toggle("ds-sel", on),
            setHeadEnabled: (on) => head.classList.toggle("ds-pane__head--idle", !on),
            setHeadTip: (t) => { tip = t; paintTip(); },
        });
    }
    // The seam between two neighbours: a grip on the LEFT pane's right edge. It moves width from one to
    // the other and leaves the rest alone; every open pane's weight becomes its px width first, so the
    // two that move keep the others where they are.
    panes.forEach((left, i) => {
        const right = panes[i + 1];
        if (!right)
            return;
        let pair = 0;
        columnGrip(left.el, {
            anchor: "right", min,
            label: "Resize the " + left.head.textContent + " and next panes",
            startWidth: () => {
                const ws = panes.map((p) => p.el.getBoundingClientRect().width);
                panes.forEach((p, k) => { if (!p.isParked())
                    p.el.style.setProperty("--ds-pane-w", String(ws[k])); });
                pair = ws[i] + ws[i + 1];
                return ws[i];
            },
            maxOf: () => pair - min,
            onResize: (w) => {
                if (left.isParked() || right.isParked())
                    return;
                left.el.style.setProperty("--ds-pane-w", String(w));
                right.el.style.setProperty("--ds-pane-w", String(pair - w));
            },
            onReset: evenOut,
        });
    });
    host.appendChild(root);
    return handle(root, {
        panes,
        pane: (id) => panes.find((p) => p.id === id),
        evenOut,
    });
}
