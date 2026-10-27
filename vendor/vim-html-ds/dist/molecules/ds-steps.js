import { el, handle } from "../dom.js";
export function createSteps(host, opts = {}) {
    const steps = (opts.steps ?? []).map((s) => (typeof s === "string" ? { label: s } : s));
    let active = opts.active ?? 0;
    const root = el("div", "ds-steps" + (opts.orientation === "vertical" ? " ds-steps--vertical" : ""));
    host.appendChild(root);
    const render = () => {
        root.textContent = "";
        steps.forEach((d, i) => {
            if (i > 0)
                root.appendChild(el("span", "ds-steps__sep"));
            const state = d.state ?? (i < active ? "done" : i === active ? "active" : "todo");
            const cls = state === "done" ? " ds-done" : state === "active" ? " ds-active" : state === "blocked" ? " ds-blocked" : "";
            const s = el("span", "ds-step" + cls);
            s.appendChild(el("span", "ds-step__num", String(i + 1)));
            const body = el("span", "ds-step__body");
            body.appendChild(el("span", "ds-step__label", d.label));
            if (d.caption)
                body.appendChild(el("span", "ds-step__cap", d.caption));
            s.appendChild(body);
            const navigable = state !== "blocked" && (i < active || (opts.canJump?.(i) ?? false));
            if (navigable) {
                s.style.cursor = "pointer";
                s.addEventListener("click", () => { active = i; render(); opts.onStep?.(i); });
            }
            root.appendChild(s);
        });
    };
    render();
    return handle(root, {
        getActive: () => active,
        setActive: (i) => { active = i; render(); },
    });
}
