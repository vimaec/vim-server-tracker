import { el, handle } from "../dom.js";
// Transient feedback stack — overlay, mounts to document.body (no host).
// show({ text, tone, timeout }) → dismiss fn. tone: cyan (default) | good | warn | bad.
export function createToaster(opts = {}) {
    const root = el("div", "ds-toaster");
    document.body.appendChild(root);
    const show = ({ text, tone, timeout = opts.timeout ?? 4000 } = {}) => {
        const t = el("div", "ds-toast" + (tone ? " ds-toast--" + tone : ""));
        t.appendChild(el("span", "ds-toast__msg", text ?? ""));
        const x = el("button", "ds-toast__close", "×");
        x.type = "button";
        t.appendChild(x);
        root.appendChild(t);
        const dismiss = () => t.remove();
        x.addEventListener("click", dismiss);
        if (timeout > 0)
            setTimeout(dismiss, timeout);
        return dismiss;
    };
    return handle(root, { show });
}
