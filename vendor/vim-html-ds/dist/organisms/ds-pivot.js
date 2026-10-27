import { el, handle } from "../dom.js";
// Matrix on ds-etable: grouped columns × expandable rows, subtotal rows as in-table bands.
// { colGroups: [string], measures: [string], rows: [{ label, values: { [group]: [n per measure] },
//   children?: [...] }], totals: true }
// A parent row shows the SUM of its children (or its own values) and toggles open/closed.
export function createPivot(host, opts = {}) {
    const colGroups = opts.colGroups ?? [];
    const measures = opts.measures ?? [];
    let rows = opts.rows ?? [];
    const wrap = el("div", "ds-etable-wrap");
    if (opts.maxHeight)
        wrap.style.maxHeight = typeof opts.maxHeight === "number" ? opts.maxHeight + "px" : opts.maxHeight;
    const table = el("table", "ds-etable");
    wrap.appendChild(table);
    host.appendChild(wrap);
    const valuesOf = (row) => {
        if (row.values)
            return row.values;
        const acc = {};
        for (const g of colGroups)
            acc[g] = measures.map((_, mi) => (row.children ?? []).reduce((a, c) => a + (valuesOf(c)[g]?.[mi] ?? 0), 0));
        return acc;
    };
    const render = () => {
        table.textContent = "";
        const thead = el("thead");
        const r1 = el("tr");
        r1.appendChild(el("th", "ds-idcol"));
        for (const g of colGroups) {
            const th = el("th", "ds-grpcol", g);
            th.colSpan = measures.length;
            r1.appendChild(th);
        }
        const r2 = el("tr");
        r2.appendChild(el("th", "ds-idcol", opts.rowLabel ?? ""));
        for (let gi = 0; gi < colGroups.length; gi++)
            measures.forEach((m, mi) => r2.appendChild(el("th", "ds-num" + (mi === 0 ? " ds-grpstart" : ""), m)));
        thead.append(r1, r2);
        table.appendChild(thead);
        const tbody = el("tbody");
        const addCells = (tr, vals) => {
            for (const g of colGroups)
                measures.forEach((_, mi) => tr.appendChild(el("td", "ds-num" + (mi === 0 ? " ds-grpstart" : ""), String(vals[g]?.[mi] ?? ""))));
        };
        const walk = (list, depth) => {
            for (const row of list) {
                const parent = !!row.children?.length;
                const tr = el("tr", parent ? "ds-subtotal" : "");
                const td = el("td", "ds-idcol");
                const hd = el("span", "ds-rowhd");
                hd.style.setProperty("--depth", String(depth));
                const caret = el("span", "ds-tree__caret");
                if (parent && row.open)
                    caret.style.transform = "rotate(90deg)";
                if (!parent)
                    caret.style.visibility = "hidden";
                hd.append(caret, document.createTextNode(row.label));
                td.appendChild(hd);
                tr.appendChild(td);
                addCells(tr, valuesOf(row));
                if (parent) {
                    tr.style.cursor = "pointer";
                    tr.addEventListener("click", () => { row.open = !row.open; opts.onToggle?.(row); render(); });
                }
                tbody.appendChild(tr);
                if (parent && row.open)
                    walk(row.children, depth + 1);
            }
        };
        walk(rows, 0);
        table.appendChild(tbody);
        if (opts.totals) {
            const tfoot = el("tfoot");
            const tr = el("tr");
            tr.appendChild(el("td", "ds-idcol", "Total"));
            const tot = {};
            for (const g of colGroups)
                tot[g] = measures.map((_, mi) => rows.reduce((a, r) => a + (valuesOf(r)[g]?.[mi] ?? 0), 0));
            addCells(tr, tot);
            tfoot.appendChild(tr);
            table.appendChild(tfoot);
        }
    };
    render();
    return handle(wrap, { setRows: (next) => { rows = next; render(); } });
}
