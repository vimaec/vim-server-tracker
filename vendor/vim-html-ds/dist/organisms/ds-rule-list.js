import { el, handle, reorderable } from "../dom.js";
import { createCheckbox } from "../atoms/ds-checkbox.js";
export function createRuleList(host, opts = {}) {
    let rules = [...(opts.rules ?? [])];
    const root = el("div", "ds-rulelist");
    const emit = () => opts.onChange?.(rules.map((r) => ({ ...r })));
    const move = (i, dir) => {
        const j = i + dir;
        // never reorder across the tail row (it stays last)
        if (j < 0 || j >= rules.length || rules[i].tail || rules[j].tail)
            return;
        [rules[i], rules[j]] = [rules[j], rules[i]];
        render();
        emit();
    };
    const render = () => {
        root.textContent = "";
        rules.forEach((r, i) => {
            const enabled = r.enabled !== false;
            const row = el("div", "ds-rule" + (r.tail ? " ds-rule--tail" : "") + (enabled ? "" : " ds-rule--off"));
            if (opts.reorderable)
                row.appendChild(el("span", r.tail ? "ds-rule__gripspace" : "ds-rule__grip", r.tail ? "" : "⠿"));
            if (!r.tail) {
                const chk = el("span", "ds-rule__enable");
                createCheckbox(chk, {
                    state: enabled ? "on" : "off",
                    onChange: (s) => { r.enabled = s === "on"; render(); opts.onToggle?.(r.id, r.enabled); emit(); },
                });
                row.appendChild(chk);
            }
            else {
                row.appendChild(el("span", "ds-rule__enable"));
            }
            const body = el("span", "ds-rule__body");
            if (r.render)
                body.appendChild(r.render(r));
            else
                body.textContent = r.label ?? "";
            if (opts.onActivate) {
                body.style.cursor = "pointer";
                body.addEventListener("click", () => opts.onActivate(r.id));
            }
            row.appendChild(body);
            const count = el("span", "ds-rule__count" + (r.count === 0 ? " ds-rule__count--none" : ""));
            count.textContent = r.count == null ? "" : r.count === 0 ? "matches nothing" : String(r.count);
            row.appendChild(count);
            const ctl = el("span", "ds-rule__ctl");
            if (!r.tail) {
                const up = el("button", "ds-rule__btn", "▴");
                up.type = "button";
                up.setAttribute("aria-label", "Move up");
                up.addEventListener("click", () => move(i, -1));
                const dn = el("button", "ds-rule__btn", "▾");
                dn.type = "button";
                dn.setAttribute("aria-label", "Move down");
                dn.addEventListener("click", () => move(i, 1));
                const rm = el("button", "ds-rule__btn", "✕");
                rm.type = "button";
                rm.setAttribute("aria-label", "Remove");
                rm.addEventListener("click", () => { rules = rules.filter((x) => x.id !== r.id); render(); opts.onRemove?.(r.id); emit(); });
                ctl.append(up, dn, rm);
            }
            row.appendChild(ctl);
            root.appendChild(row);
        });
    };
    render();
    host.appendChild(root);
    let teardown;
    if (opts.reorderable) {
        teardown = reorderable(root, {
            itemSelector: ".ds-rule",
            handleSelector: ".ds-rule__grip",
            onReorder: (fromIdx, toIdx) => {
                const [moved] = rules.splice(fromIdx, 1);
                const tailPos = rules.findIndex((r) => r.tail);
                rules.splice(tailPos >= 0 && toIdx > tailPos ? tailPos : toIdx, 0, moved);
                render();
                emit();
            },
        });
    }
    return handle(root, {
        setRules: (next) => { rules = [...next]; render(); },
        getRules: () => rules.map((r) => ({ ...r })),
        destroy: () => { teardown?.(); root.remove(); },
    });
}
