import { el, handle } from "../dom.js";
import { createChip } from "../atoms/ds-chip.js";
import { createPathChip } from "../atoms/ds-path-chip.js";
import { createMenu } from "../molecules/ds-menu.js";
// Project/model picker card. Preview slot on stage-950; status: "linked" | "packaged";
// meta = one mono line; actions = ds-menu items behind the hover … button. Whole card = onOpen.
export function createThumbCard(host, opts = {}) {
    const root = el("div", "ds-thumbcard");
    let menu = null;
    if (opts.actions?.length) {
        menu = createMenu({ items: opts.actions });
        const m = el("button", "ds-thumbcard__menu", "…");
        m.type = "button";
        m.addEventListener("click", (e) => { e.stopPropagation(); menu.openUnder(m); });
        root.appendChild(m);
    }
    const preview = el("div", "ds-thumbcard__preview");
    const setThumb = (url) => {
        preview.replaceChildren();
        if (url) {
            const img = el("img");
            img.src = url;
            img.alt = opts.name ?? "";
            preview.appendChild(img);
        }
        else
            preview.appendChild(el("span", "ds-label ds-label--dim", "no preview"));
    };
    setThumb(opts.thumb);
    const titlerow = el("div", "ds-thumbcard__titlerow");
    titlerow.appendChild(el("span", "ds-thumbcard__name", opts.name ?? ""));
    if (opts.status)
        createChip(titlerow, {
            text: opts.status === "packaged" ? "Packaged" : "Linked",
            tone: opts.status === "packaged" ? "cyan" : undefined,
        });
    if (opts.chip)
        createChip(titlerow, opts.chip);
    root.append(preview, titlerow);
    if (opts.meta)
        root.appendChild(el("div", "ds-thumbcard__meta", opts.meta));
    if (opts.time)
        root.appendChild(el("div", "ds-thumbcard__time", opts.time));
    if (opts.path)
        createPathChip(root, { path: opts.path, onOpen: opts.onExplore });
    if (opts.onOpen)
        root.addEventListener("click", () => opts.onOpen());
    host.appendChild(root);
    return handle(root, {
        setThumb,
        destroy: () => { menu?.destroy(); root.remove(); },
    });
}
