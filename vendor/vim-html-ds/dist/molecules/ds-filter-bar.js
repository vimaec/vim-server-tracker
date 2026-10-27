import { el, handle } from "../dom.js";
import { createMenu } from "./ds-menu.js";
import { createButton } from "../atoms/ds-button.js";
export function createFilterBar(host, opts = {}) {
    let filters = [...(opts.filters ?? [])];
    const root = el("div", "ds-filterbar");
    host.appendChild(root);
    const menu = createMenu({});
    const render = () => {
        root.textContent = "";
        filters.forEach((f, i) => {
            const chip = el("span", "ds-fchip");
            chip.appendChild(el("span", "ds-fchip__key", f.key));
            chip.appendChild(document.createTextNode(` ${f.op ?? "="} ${f.value}`));
            const x = el("button", "ds-fchip__x", "×");
            x.type = "button";
            x.addEventListener("click", () => {
                const [removed] = filters.splice(i, 1);
                render();
                opts.onRemove?.(removed);
            });
            chip.appendChild(x);
            root.appendChild(chip);
        });
        const add = el("button", "ds-filterbar__add", "+ Add filter");
        add.type = "button";
        add.addEventListener("click", () => {
            menu.setItems((opts.fields ?? []).map((f) => ({ label: f, onClick: () => opts.onAdd?.(f) })));
            menu.openUnder(add);
        });
        root.appendChild(add);
        if (filters.length) {
            const clear = createButton(root, { label: "Clear all", variant: "ghost", onClick: () => { filters = []; render(); opts.onClear?.(); } });
            clear.el.style.height = "22px";
            clear.el.style.fontSize = "var(--ds-fs-eyebrow)";
        }
    };
    render();
    return handle(root, {
        getFilters: () => [...filters],
        setFilters: (next) => { filters = [...next]; render(); },
        destroy: () => { menu.destroy(); root.remove(); },
    });
}
