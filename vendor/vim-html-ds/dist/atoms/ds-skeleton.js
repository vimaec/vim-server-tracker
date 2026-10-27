import { el, handle } from "../dom.js";
export function createSkeleton(host, opts = {}) {
    const root = el("div");
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.gap = "6px";
    const n = opts.count ?? 1;
    for (let i = 0; i < n; i++) {
        const s = el("div", "ds-skeleton ds-skeleton--" + (opts.variant ?? "text"));
        if (opts.width)
            s.style.width = typeof opts.width === "number" ? opts.width + "px" : opts.width;
        else if (opts.variant !== "block" && n > 1)
            s.style.width = (100 - (i % 3) * 18) + "%";
        if (opts.height)
            s.style.height = typeof opts.height === "number" ? opts.height + "px" : opts.height;
        root.appendChild(s);
    }
    host.appendChild(root);
    return handle(root, {});
}
