import { el, handle } from "../dom.js";
import { createButton } from "../atoms/ds-button.js";
export function createMatchBar(host, opts) {
    const root = el("div", "ds-match-bar");
    const rowEl = el("div", "ds-match-bar__row");
    const count = el("span", "ds-match-bar__count");
    const label = el("span", "ds-match-bar__label");
    const idpill = el("span", "ds-match-bar__idpill");
    const spacer = el("span", "ds-match-bar__spacer");
    rowEl.append(count, label, idpill, spacer);
    const setMatched = (matched, total) => {
        count.textContent = matched.toLocaleString();
        count.classList.toggle("ds-match-bar__count--zero", matched === 0);
        label.textContent = total == null ? "elements matched" : "of " + total.toLocaleString() + " elements match";
    };
    const setById = (n) => {
        idpill.textContent = "+" + Math.max(0, n).toLocaleString() + " BY REVIT ID";
        idpill.hidden = !(n > 0);
    };
    setMatched(opts.matched, opts.total);
    setById(opts.byIdCount ?? 0);
    if (opts.actions?.length) {
        const actions = el("div", "ds-match-bar__actions");
        for (const a of opts.actions)
            createButton(actions, { label: a.label, onClick: a.onClick, disabled: a.disabled });
        rowEl.appendChild(actions);
    }
    root.appendChild(rowEl);
    const sqlEl = el("code", "ds-match-bar__sql");
    const setSql = (text) => {
        const has = !!text && text.trim().length > 0;
        sqlEl.textContent = has ? text : "";
        sqlEl.hidden = !has;
    };
    setSql(opts.sql);
    root.appendChild(sqlEl);
    host.appendChild(root);
    return handle(root, { setMatched, setById, setSql });
}
