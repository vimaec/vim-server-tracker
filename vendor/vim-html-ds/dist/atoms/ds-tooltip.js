import { el, clampFixed, handle } from "../dom.js";
// OSR-safe hover tooltip manager — overlay, mounts to document.body (no host).
// Usage: const tip = createTooltip(); el.setAttribute(DS_TIP_ATTR, "…"); tip.bindAll(panel);
export const DS_TIP_ATTR = "data-ds-tip";
// Per-target reveal-delay override (ms), read beside DS_TIP_ATTR at hover time.
export const DS_TIP_DELAY_ATTR = "data-ds-tip-delay";
export function createTooltip(opts = {}) {
    const node = el("div", "ds-tip");
    document.body.appendChild(node);
    const delay = opts.delay ?? 350;
    const anchor = opts.anchor ?? "cursor";
    let timer = 0;
    let flashTimer = 0;
    let flashing = false; // a flash holds the tip against the hover hides until its time is up
    const show = (target, x, y, text, mode = anchor) => {
        node.textContent = text ?? target.getAttribute(DS_TIP_ATTR) ?? "";
        if (!node.textContent)
            return;
        node.classList.add("ds-show"); // visible first so the rect below is measurable
        if (mode === "element") {
            const b = target.getBoundingClientRect();
            const r = node.getBoundingClientRect();
            const pad = 8, gap = 9;
            // Centre on the target; on a target wider than the tip, follow the pointer within it.
            let cx = b.left + b.width / 2;
            if (b.width > r.width)
                cx = Math.max(b.left + r.width / 2, Math.min(x, b.right - r.width / 2));
            let left = cx - r.width / 2;
            left = Math.max(pad, Math.min(left, innerWidth - r.width - pad));
            let top = b.top - r.height - gap;
            if (top < pad)
                top = b.bottom + gap; // flip below when clipped at the top
            top = Math.min(top, innerHeight - r.height - pad);
            node.style.left = Math.round(left) + "px";
            node.style.top = Math.round(top) + "px";
        }
        else {
            clampFixed(node, x + 12, y + 14);
        }
    };
    const hide = () => {
        clearTimeout(timer);
        clearTimeout(flashTimer);
        flashing = false;
        node.classList.remove("ds-show");
    };
    const hoverHide = () => { if (!flashing)
        hide(); };
    const flash = (target, text, opts = {}) => {
        clearTimeout(timer);
        clearTimeout(flashTimer);
        flashing = true;
        if (opts.at)
            show(target, opts.at.x, opts.at.y, text, "cursor");
        else
            show(target, 0, 0, text, "element");
        flashTimer = window.setTimeout(() => { flashing = false; node.classList.remove("ds-show"); }, opts.ms ?? 1400);
    };
    // An ellipsis-clipped element explains ITSELF: hovering text that is actually cut off tooltips
    // its full content — everywhere, with no per-site wiring. Fires only when the text is really
    // clipped (scrollWidth beats clientWidth) AND really ellipsized (the computed style says so),
    // so intact text stays quiet. Checks the hovered element and a couple of ancestors, since the
    // pointer often lands on an inner span of the clipped block.
    const clipTarget = (start) => {
        let cur = start;
        for (let depth = 0; cur !== null && depth < 3; cur = cur.parentElement, depth++) {
            if (!(cur instanceof HTMLElement))
                break;
            if (cur.scrollWidth > cur.clientWidth + 1 && getComputedStyle(cur).textOverflow === "ellipsis") {
                const text = (cur.textContent ?? "").trim();
                if (text)
                    return { target: cur, text: text.length > 400 ? text.slice(0, 400) + "…" : text };
            }
        }
        return null;
    };
    // The pointer's latest position: the reveal fires after a delay, and a wide target docks the tip
    // at the pointer, so it must be where the pointer rests, not where it crossed into the target.
    let px = 0, py = 0;
    const bindAll = (root) => {
        root.addEventListener("mousemove", (e) => { px = e.clientX; py = e.clientY; });
        root.addEventListener("mouseover", (e) => {
            if (flashing)
                return; // a confirmation is not replaced by a hover text
            px = e.clientX;
            py = e.clientY;
            const t = e.target.closest?.(`[${DS_TIP_ATTR}]`);
            const clip = t ? null : clipTarget(e.target);
            if (!t && !clip)
                return;
            clearTimeout(timer);
            // A target can shorten (or lengthen) its own reveal: content-carrying tips — a note cell's
            // text — want to appear faster than explainer tips.
            const d = Number(t?.getAttribute(DS_TIP_DELAY_ATTR) ?? delay);
            timer = setTimeout(() => (t ? show(t, px, py) : show(clip.target, px, py, clip.text)), Number.isFinite(d) ? d : delay);
        });
        root.addEventListener("mouseout", hoverHide);
        root.addEventListener("mousedown", hoverHide);
    };
    return handle(node, {
        bindAll, hide, flash,
        destroy: () => { clearTimeout(timer); clearTimeout(flashTimer); node.remove(); },
    });
}
