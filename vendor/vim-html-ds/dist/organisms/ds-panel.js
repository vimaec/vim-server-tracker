import { el, handle } from "../dom.js";
// Inspector side panel — in-flow flex child (never an overlay). side: "right" (default) | "left".
export function createPanel(host, opts = {}) {
    const root = el("aside", "ds-panel" + (opts.side === "left" ? " ds-panel--left" : "") + (opts.fill ? " ds-panel--fill" : ""));
    if (opts.width)
        root.style.width = typeof opts.width === "number" ? opts.width + "px" : opts.width;
    const head = el("div", "ds-panel__head");
    const title = el("div", "ds-panel__title", opts.title ?? "");
    if (opts.tip)
        title.setAttribute("data-ds-tip", opts.tip);
    head.appendChild(title);
    const subtitle = el("span", "ds-panel__subtitle", opts.subtitle ?? "");
    head.appendChild(subtitle);
    // A head with nothing to say is no head at all — an empty padded band with a hairline
    // otherwise sits above the body. setTitle/setSubtitle reveal it the moment content arrives.
    // The actions slot is created on first read, never ahead of time: a present-but-hidden sibling
    // would still match the CSS that hands the close's auto margin over to it.
    let actions = null;
    let crumb = null;
    let close = null;
    const syncHead = () => {
        head.style.display =
            title.textContent || subtitle.textContent || opts.onClose || actions || crumb ? "" : "none";
    };
    if (opts.onClose) {
        close = el("button", "ds-panel__close", "×");
        close.type = "button";
        close.addEventListener("click", () => opts.onClose());
        head.appendChild(close);
    }
    const body = el("div", "ds-panel__body");
    const foot = el("div", "ds-panel__foot");
    foot.style.display = "none";
    syncHead();
    root.append(head, body, foot);
    host.appendChild(root);
    if (opts.adopt) {
        const src = typeof opts.adopt === "string" ? document.querySelector(opts.adopt) : opts.adopt;
        if (src) {
            while (src.firstChild)
                body.appendChild(src.firstChild);
            src.remove();
        }
    }
    return handle(root, {
        body,
        get actions() {
            if (!actions) {
                actions = el("div", "ds-panel__actions");
                head.insertBefore(actions, close);
                syncHead();
            }
            return actions;
        },
        get crumb() {
            if (!crumb) {
                crumb = el("div", "ds-panel__crumb");
                title.after(crumb);
                head.classList.add("ds-panel__head--crumb"); // the title takes the crumb's baseline
                syncHead();
            }
            return crumb;
        },
        get foot() { foot.style.display = ""; return foot; },
        setSubtitle: (t) => { subtitle.textContent = t ?? ""; syncHead(); },
        setTitle: (t) => { title.textContent = t; syncHead(); },
    });
}
