import { el, handle, childScope, columnGrip, rowGrip, rovingFocus, clampFixed, onClickOutside } from "../dom.js";
import { createCheckbox } from "../atoms/ds-checkbox.js";
import { createSegmented } from "../atoms/ds-segmented.js";
import { createInput } from "../atoms/ds-input.js";
import { createEditCell } from "../molecules/ds-edit-cell.js";
import { createSelect } from "../atoms/ds-select.js";
import { createDateField } from "../molecules/ds-date-field.js";
import { DS_TIP_ATTR, DS_TIP_DELAY_ATTR } from "../atoms/ds-tooltip.js";
import { createTextarea } from "../atoms/ds-textarea.js";
import { createMenu } from "../molecules/ds-menu.js";
import { windowRange } from "../virtual.js";
// The data grid: sortable headers, sticky identity column, totals footer, plus the opt-ins — each
// backed by a documented molecule/atom. select {mode, checkboxes, seedFirst, allNone} is the model
// (row click is the base gesture; see TableSelect). Shift-range extension works on both gestures;
// rowMenu opens a ds-menu on right-click; bands add a collapsible super-header; editable cells use
// ds-editcell / ds-select; render()/rowTone/cellState decorate cells. First column = identity.
// The note cell's popover editor: an opaque floating panel (ds-menu chrome) with a textarea.
// Outside click and Done COMMIT (a note is prose, not a form — losing it to a stray click would
// hurt more than committing it); Escape cancels.
function openNotePopover(anchor, value, placeholder, onCommit) {
    const pop = el("div", "ds-menu ds-notepop");
    const ta = createTextarea(pop, { value, rows: 4, placeholder: placeholder ?? "note…" });
    const done = el("button", "ds-btn ds-notepop__done", "Done");
    done.type = "button";
    pop.appendChild(done);
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.position = "fixed";
    pop.style.left = Math.max(4, Math.min(r.left, window.innerWidth - 300)) + "px";
    pop.style.top = Math.max(4, Math.min(r.bottom + 2, window.innerHeight - 170)) + "px";
    pop.style.zIndex = "1000";
    let closed = false;
    const close = (commit) => {
        if (closed)
            return;
        closed = true;
        const v = ta.getValue();
        unbindOutside();
        pop.remove();
        if (commit && v !== value)
            onCommit(v);
    };
    const unbindOutside = onClickOutside([pop], () => close(true));
    done.addEventListener("click", () => close(true));
    pop.addEventListener("keydown", (e) => { if (e.key === "Escape") {
        e.stopPropagation();
        close(false);
    } });
    ta.el.focus();
}
// The checkbox column's fixed width — the colgroup <col> and the pinned-layout total must agree.
const CHECK_COL_PX = 28;
export function createTable(host, opts = {}) {
    let cols = opts.columns ?? [];
    const bands = opts.bands ?? [];
    let rows = [...(opts.rows ?? [])];
    let sort = opts.sort ?? null;
    // Selection is stored as IDENTITIES: rowKey(row) when the consumer names one, else the base-array
    // index. Keys are what let a selection survive setRows; indices cannot (a row that inherits an
    // index is a different row), which is why index-based selection clears on setRows instead.
    const selMode = opts.select?.mode ?? null;
    const selCheckboxes = selMode === "multi" && !!opts.select?.checkboxes;
    const selSeedFirst = !!opts.select?.seedFirst;
    // Checkbox tables whose body clicks flip the checks (select.rowClick "toggle"): no soft layer.
    const selRowToggle = selCheckboxes && opts.select?.rowClick === "toggle";
    // The soft layer exists only where body clicks drive it.
    const selSoft = selCheckboxes && !selRowToggle;
    const selAllNone = selMode === "multi" && !!opts.select?.allNone && !opts.select?.checkboxes;
    // Distinguishes "empty because nothing has been chosen yet" from "empty because the user said so" —
    // the whole reason seedFirst can seat a row without ever overruling a deliberate none.
    let userEmptied = false;
    const idcol = opts.stickyIdentity !== false ? "ds-idcol" : "";
    const idOf = (row) => (opts.rowKey ? opts.rowKey(row) : rows.indexOf(row));
    let selected = new Set();
    let collapsedBands = new Set(bands.filter((b) => b.collapsed).map((b) => b.id));
    // columnId -> the values the user has UNCHECKED (see TableColumn.filter for why exclusions).
    const excluded = new Map();
    // columnId -> the active comparison (filter: "number" and "date" columns).
    const cmpFilters = new Map();
    // Collapsed group heads (groups mode), keyed by group name so the state survives new data.
    const collapsedGroups = new Set();
    // The soft selection (checkbox tables): the glance layer the body clicks drive. Its own anchor —
    // a Shift range over the soft layer must not depend on where a checkbox interval last ended.
    let softSel = new Set();
    let softAnchor = null;
    const softRows = () => rows.filter((r) => softSel.has(idOf(r)));
    const emitSoft = () => opts.onSoftSelect?.(softRows());
    // ---- row drag & drop (rowDrag; needs groups). Document-level listeners, never pointer capture:
    // OSR drops a capture the moment the cursor leaves the node, so the document is the only surface
    // a drag can trust. A drag begins after a small movement threshold — a plain press-release stays
    // a click — and dragging a SELECTED row drags the whole selection (the bulk-edit rule).
    const dragEnabled = () => !!(opts.rowDrag && opts.groupBy && opts.groups);
    let dragPending = null;
    let dragLive = null;
    let dragTargetGroup = null;
    let dragTargetEl = null;
    let dragJustEnded = false;
    const dragCleanup = () => {
        dragLive?.ghost.remove();
        dragTargetEl?.classList.remove("ds-droptarget");
        dragPending = null;
        dragLive = null;
        dragTargetGroup = null;
        dragTargetEl = null;
    };
    const onDragMove = (e) => {
        if (dragPending && !dragLive) {
            if (Math.abs(e.clientX - dragPending.x) + Math.abs(e.clientY - dragPending.y) < 5)
                return;
            const pressed = dragPending.row;
            // The layer the pressed row belongs to travels with it: soft first (the staging), then the
            // hard set, then the row alone — the same precedence bulk edits follow.
            const dragRows = softSel.has(idOf(pressed)) ? softRows()
                : selected.has(idOf(pressed)) ? selectedRows() : [pressed];
            const ghost = el("div", "ds-dragghost", dragRows.length + " row" + (dragRows.length === 1 ? "" : "s"));
            document.body.appendChild(ghost);
            dragLive = { rows: dragRows, ghost };
        }
        if (!dragLive)
            return;
        dragLive.ghost.style.left = e.clientX + 12 + "px";
        dragLive.ghost.style.top = e.clientY + 12 + "px";
        const over = e.target instanceof Element ? e.target.closest("tr[data-grp]") : null;
        if (over !== dragTargetEl) {
            dragTargetEl?.classList.remove("ds-droptarget");
            dragTargetEl = over;
            dragTargetGroup = over ? (over.dataset.grp ?? null) : null;
            over?.classList.add("ds-droptarget");
        }
    };
    const onDragUp = () => {
        if (dragLive && dragTargetGroup != null) {
            const moved = dragLive.rows.filter((r) => String(r[opts.groupBy] ?? "") !== dragTargetGroup);
            if (moved.length) {
                opts.rowDrag.onDropToGroup(moved, dragTargetGroup);
                // The browser fires a click right after this mouseup when press and release shared an
                // element — that tail click must not focus/select. A REAL later click always begins with
                // its own mousedown, which clears this flag; only the drop's tail (no mousedown between)
                // is swallowed.
                dragJustEnded = true;
            }
        }
        dragCleanup();
    };
    const onDragKey = (e) => { if (e.key === "Escape")
        dragCleanup(); };
    if (opts.rowDrag) {
        document.addEventListener("mousemove", onDragMove, true);
        document.addEventListener("mouseup", onDragUp, true);
        document.addEventListener("keydown", onDragKey, true);
    }
    let filterPop = null;
    const cellText = (row, c) => {
        const v = row[c.id];
        return c.format ? c.format(v) : v == null ? "" : String(v);
    };
    const rowPasses = (row) => {
        for (const [id, ex] of excluded) {
            if (ex.size === 0)
                continue;
            const c = cols.find((x) => x.id === id);
            if (!c)
                continue; // a filtered column that left: its filter is inert
            if (ex.has(cellText(row, c)))
                return false;
        }
        for (const [id, f] of cmpFilters) {
            const c = cols.find((x) => x.id === id);
            if (!c)
                continue;
            const rawCell = row[id];
            if (rawCell == null || rawCell === "")
                return false; // a comparison an empty cell cannot satisfy
            if (c.filter === "date") {
                // ISO strings order chronologically, so string comparison IS date comparison; a timestamped
                // cell compares by its date part.
                const v = String(rawCell).slice(0, 10);
                const w = String(f.value);
                if (f.op === "=" ? v !== w
                    : f.op === ">=" ? v < w
                        : f.op === ">" ? v <= w
                            : f.op === "<" ? v >= w
                                : v > w)
                    return false;
            }
            else {
                const v = Number(rawCell); // (Number(null) is 0, so blank needs its own check)
                if (Number.isNaN(v))
                    return false;
                if (f.op === "=") {
                    // Equality is against what the READER sees: a formatted column compares formatted, so
                    // typing the on-screen value matches (raw floats rarely equal their 4-decimal display).
                    const match = c.format ? c.format(v) === c.format(Number(f.value)) : v === Number(f.value);
                    if (!match)
                        return false;
                }
                else if (f.op === ">=" && !(v >= Number(f.value)))
                    return false;
                else if (f.op === ">" && !(v > Number(f.value)))
                    return false;
                else if (f.op === "<" && !(v < Number(f.value)))
                    return false;
                else if (f.op === "<=" && !(v <= Number(f.value)))
                    return false;
            }
        }
        return true;
    };
    const visibleRows = () => (excluded.size || cmpFilters.size ? rows.filter(rowPasses) : rows);
    const closeFilterPop = () => { filterPop?.unbind(); filterPop?.el.remove(); filterPop = null; };
    // A filter change can hide selected rows. Dropping them is the honest move — a selection you cannot
    // see is one you cannot check before acting on it — and seedFirst then re-seats within what is
    // visible, so a filtered table is not a dead end either.
    const pruneSelectionToVisible = () => {
        const alive = new Set(visibleRows().map((r) => idOf(r)));
        const before = selected.size;
        const softBefore = softSel.size;
        selected = new Set([...selected].filter((id) => alive.has(id)));
        softSel = new Set([...softSel].filter((id) => alive.has(id)));
        // seedFirst seats the layer the body clicks drive: soft in soft-click checkbox tables, hard
        // otherwise — checkmarks in a checkbox table are strictly user-made, so a "toggle" table seats
        // nothing.
        if (selSeedFirst && !userEmptied) {
            if (selSoft && softSel.size === 0) {
                const first = visibleRows()[0];
                if (first)
                    softSel = new Set([idOf(first)]);
            }
            else if (!selCheckboxes && selected.size === 0) {
                const first = visibleRows()[0];
                if (first)
                    selected = new Set([idOf(first)]);
            }
        }
        if (softSel.size !== softBefore)
            queueMicrotask(emitSoft);
        return selected.size !== before;
    };
    // The funnel popover: every distinct value of the column, checkable, with an All master. Values come
    // from ALL rows, not from the currently-visible ones — a list that shrinks as you uncheck is a list
    // you cannot undo from.
    const filterStateOut = () => {
        const out = {};
        for (const [k, v] of excluded)
            if (v.size > 0)
                out[k] = [...v];
        for (const [k, f] of cmpFilters)
            out[k] = { ...f };
        return out;
    };
    // The shared tail of every filter mutation: reshow, re-seat, retell.
    const filterChanged = () => {
        const changed = pruneSelectionToVisible();
        render();
        if (changed)
            emitSel();
        opts.onFilter?.(filterStateOut());
    };
    const openFilterPop = (c, anchor) => {
        closeFilterPop();
        const pop = el("div", "ds-filterpop");
        if (c.filter === "number" || c.filter === "date") {
            openCompareFilterPop(c, anchor, pop);
            return;
        }
        const values = [...new Set(rows.map((r) => cellText(r, c)))].sort((a, b) => a.localeCompare(b));
        const ex = () => excluded.get(c.id) ?? new Set();
        const setEx = (next) => {
            if (next.size)
                excluded.set(c.id, next);
            else
                excluded.delete(c.id);
            filterChanged();
        };
        const head = el("div", "ds-filterpop__head");
        const master = createCheckbox(head, {
            label: "All",
            state: ex().size === 0 ? "on" : ex().size >= values.length ? "off" : "partial",
            onChange: (st) => { setEx(st === "on" ? new Set() : new Set(values)); closeFilterPop(); },
        });
        master.el.setAttribute("aria-label", "All values");
        pop.appendChild(head);
        const list = el("div", "ds-filterpop__list");
        for (const v of values) {
            const rowEl = el("div", "ds-filterpop__row");
            createCheckbox(rowEl, {
                label: v === "" ? "(blank)" : v,
                state: ex().has(v) ? "off" : "on",
                onChange: (st) => {
                    const next = new Set(ex());
                    st === "on" ? next.delete(v) : next.add(v);
                    setEx(next);
                },
            });
            list.appendChild(rowEl);
        }
        pop.appendChild(list);
        document.body.appendChild(pop);
        const r = anchor.getBoundingClientRect();
        clampFixed(pop, r.left, r.bottom + 2);
        filterPop = { el: pop, unbind: onClickOutside([pop, anchor], () => closeFilterPop()) };
    };
    // The comparison popover ("number" and "date" columns): an operator and a threshold, applied as
    // soon as both exist. A new threshold re-applies live; Clear drops the filter. No Apply button —
    // the table repainting under the popover IS the feedback, same as checking a value in the list
    // flavour. Dates pick their threshold in a ds-date-field (typed ISO or the calendar).
    const openCompareFilterPop = (c, anchor, pop) => {
        const isDate = c.filter === "date";
        const current = cmpFilters.get(c.id) ?? null;
        let op = current?.op ?? ">=";
        let raw = current != null ? String(current.value) : "";
        const apply = () => {
            const bad = isDate ? raw === "" : (raw.trim() === "" || Number.isNaN(Number(raw)));
            if (bad)
                cmpFilters.delete(c.id);
            else
                cmpFilters.set(c.id, { op, value: isDate ? raw : Number(raw) });
            filterChanged();
        };
        const head = el("div", "ds-filterpop__head");
        createSegmented(head, {
            options: [{ id: ">=", label: "≥" }, { id: ">", label: ">" }, { id: "=", label: "=" },
                { id: "<", label: "<" }, { id: "<=", label: "≤" }],
            value: op,
            onChange: (v) => { op = v; apply(); },
        });
        pop.appendChild(head);
        const body = el("div", "ds-filterpop__row");
        let focusValue;
        if (isDate) {
            const df = createDateField(body, { value: raw, onChange: (iso) => { raw = iso; apply(); } });
            focusValue = () => df.el.querySelector("input")?.focus();
        }
        else {
            const input = createInput(body, {
                placeholder: "value",
                value: raw,
                onInput: (v) => { raw = v; apply(); },
            });
            focusValue = () => input.focus();
        }
        pop.appendChild(body);
        const foot = el("div", "ds-filterpop__row");
        const clear = el("button", "ds-btn ds-btn--ghost", "Clear");
        clear.type = "button";
        clear.addEventListener("click", () => {
            cmpFilters.delete(c.id);
            filterChanged();
            closeFilterPop();
        });
        foot.appendChild(clear);
        pop.appendChild(foot);
        document.body.appendChild(pop);
        const r = anchor.getBoundingClientRect();
        clampFixed(pop, r.left, r.bottom + 2);
        // The calendar the date field opens mounts on document.body — OUTSIDE this popover's DOM — so
        // the plain outside-click dismissal would close the filter mid-pick. A pick inside any
        // ds-datepicker counts as inside.
        const onDown = (e) => {
            const t = e.target;
            if (pop.contains(t) || anchor.contains(t) || t.closest(".ds-datepicker"))
                return;
            unbindDown();
            closeFilterPop();
        };
        const unbindDown = () => document.removeEventListener("pointerdown", onDown, true);
        document.addEventListener("pointerdown", onDown, true);
        filterPop = { el: pop, unbind: unbindDown };
        focusValue();
    };
    let anchor = null; // display position of the last plain selection click
    let shiftAtPress = false; // captured on mousedown, consumed by the checkbox onChange
    // Editor controls (enum = createSelect) mount body-level nodes; render() rebuilds the table, so the
    // previous batch must be disposed each pass and on teardown or they leak. childScope owns that.
    const editors = childScope();
    // Grips hold a document-level pointermove, so every rebuild must tear them down explicitly. Their
    // own scope (not the editors') keeps the two lifetimes independent — disposing editors alone, as
    // an in-place editor refresh would, must never silently kill a live drag.
    const grips = childScope();
    let menu = null;
    const bandOf = new Map();
    for (const b of bands)
        for (const cid of b.columns)
            bandOf.set(cid, b);
    // Explicit widths only. A column with no entry keeps its share of the remaining space, so a
    // resizable grid still lays out sensibly before anything has been dragged.
    const widths = new Map();
    for (const c of cols)
        if (c.width != null)
            widths.set(c.id, c.width);
    // What each column measured before any pinning — the reset target for columns with no declared
    // width, remembered once (a pinned layout can no longer measure "natural").
    const naturalWidths = new Map();
    const wrap = el("div", "ds-etable-wrap" + (opts.fill ? " ds-etable-wrap--fill" : ""));
    const declaredMaxH = () => opts.maxHeight == null ? "" : typeof opts.maxHeight === "number" ? opts.maxHeight + "px" : opts.maxHeight;
    if (opts.maxHeight && !opts.fill)
        wrap.style.maxHeight = declaredMaxH();
    const table = el("table", "ds-etable" + (opts.resizable ? " ds-etable--fixed" : ""));
    wrap.appendChild(table);
    host.appendChild(wrap);
    // ---- virtual windowing. render() hands the window the sorted, filtered view and the row builder;
    // a scroll or a resize of the wrap then cuts a new window without rebuilding the header.
    const virtual = opts.virtual ?? null;
    if (virtual && (opts.groupBy || bands.length || opts.rowDrag))
        throw new Error("createTable: virtual cannot combine with groupBy, bands or rowDrag");
    if (virtual) {
        table.classList.add("ds-etable--virtual");
        table.style.setProperty("--ds-vrow-h", virtual.rowHeight + "px");
    }
    let vView = [];
    let vBody = null;
    let vBuild = null;
    let vSpan = 1;
    let vRaf = 0;
    let vRo = null;
    const headH = () => table.tHead?.offsetHeight ?? 0; // the sticky header is in the flow above the rows
    const vPad = (h) => {
        const tr = el("tr", "ds-etable__vpad");
        const td = el("td");
        td.colSpan = vSpan;
        td.style.height = h + "px";
        tr.appendChild(td);
        return tr;
    };
    // `scrollTop` is the wrap's unless the caller knows better — render() passes the position it read
    // before emptying the table. Everything is measured BEFORE the body changes and the rows land in one
    // swap: a body emptied first shortens the scroller, and the next layout clamps its scroll to 0.
    const paintWindow = (scrollTop = wrap.scrollTop) => {
        vRaf = 0;
        if (!virtual || !vBody || !vBuild)
            return;
        const w = windowRange({ scrollTop: Math.max(0, scrollTop - headH()), viewportHeight: wrap.clientHeight || 0,
            rowHeight: virtual.rowHeight, rowCount: vView.length, overscan: virtual.overscan });
        editors.disposeAll(); // the window's edit cells go with their rows
        const next = document.createDocumentFragment();
        if (w.count > 0) {
            if (w.offsetY > 0)
                next.appendChild(vPad(w.offsetY));
            for (let i = w.firstIndex; i <= w.lastIndex; i++)
                next.appendChild(vBuild(vView[i], i));
            const below = (vView.length - 1 - w.lastIndex) * virtual.rowHeight;
            if (below > 0)
                next.appendChild(vPad(below));
        }
        vBody.replaceChildren(next);
        rovingFocus(wrap, "tbody tr.ds-erow");
    };
    if (virtual) {
        wrap.addEventListener("scroll", () => { if (!vRaf)
            vRaf = requestAnimationFrame(() => paintWindow()); });
        if (typeof ResizeObserver !== "undefined") {
            vRo = new ResizeObserver(() => paintWindow());
            vRo.observe(wrap);
        }
    }
    // A dragged height is REAL (height, with the declared cap released): the viewport holds the size
    // the user gave it even past its rows, so the bar works as a splitter against the layout below.
    // Reset returns to the resting rule — content-sized under the declared maxHeight.
    const applyMaxH = (h) => {
        wrap.style.height = h == null ? "" : h + "px";
        wrap.style.maxHeight = h == null ? declaredMaxH() : "";
    };
    let heightBar = null;
    let offHeightGrip = null;
    if (opts.heightResizable && !opts.fill) {
        heightBar = el("div", "ds-rowgrip-host");
        wrap.after(heightBar);
        offHeightGrip = rowGrip(heightBar, {
            min: opts.minHeight ?? 64,
            maxOf: opts.maxHeightOf,
            label: "Resize table height",
            // Measure the wrap: a table shorter than its cap must drag from where the bar actually sits,
            // or the first stretch of the drag is dead while the pointer catches up to the cap.
            startWidth: () => wrap.getBoundingClientRect().height,
            onResize: (h) => { applyMaxH(h); opts.onHeightResize?.(h); },
            onReset: () => { applyMaxH(null); opts.onHeightResize?.(null); },
        });
    }
    const fmt = (c, v) => (c.format ? c.format(v) : v == null ? "" : String(v));
    const selectedRows = () => rows.filter((r) => selected.has(idOf(r)));
    const emitSel = () => opts.onSelect?.(selectedRows());
    // A click on an interactive descendant (editor input, enum select, a rowMenu trigger, a custom
    // render()'s button) is that control's click, not a selection gesture. Guarded HERE so every
    // consumer gets it, instead of each page rediscovering that a cell edit also flipped the selection.
    const isInteractive = (t) => t instanceof Element && t.closest("button, input, select, a, [contenteditable], .ds-editcell, .ds-check, .ds-iconbtn") != null;
    // The row-click selection gesture. `pos` is the DISPLAY position (for Shift ranges over the sorted
    // view); identity does the actual bookkeeping.
    const clickRow = (row, pos, displayToOrig, ev) => {
        const id = idOf(row);
        const was = selected.has(id);
        if (dragJustEnded) {
            dragJustEnded = false;
            return;
        } // a drop's tail click is not a gesture
        // Checkbox tables ("soft" rowClick): EVERY body click drives the SOFT layer with the full
        // selection grammar — plain replaces (and releases when the row is the sole member), Ctrl
        // toggles, Shift extends. The hard set is the checkbox column's alone.
        // "toggle" rowClick: the body click is the checkbox's own gesture over the whole row — plain
        // and Ctrl flip the row's check, Shift sets the range from the anchor to the row's new state.
        // A Shift range needs an anchor, but the selection it extends may not have come from a click —
        // the seeded first-row glance, or a setSoftSelected/setSelected write. Derive it lazily: the
        // first selected row in display order anchors the range, so Shift works from a seeded row
        // exactly as it does from a clicked one.
        const anchorFrom = (sel) => {
            for (let k = 0; k < displayToOrig.length; k++) {
                const o = displayToOrig[k];
                if (o != null && sel.has(idOf(rows[o])))
                    return k;
            }
            return null;
        };
        if (selRowToggle) {
            const on = !was;
            if (ev.shiftKey && anchor == null)
                anchor = anchorFrom(selected);
            if (ev.shiftKey && anchor != null) {
                const [lo, hi] = anchor <= pos ? [anchor, pos] : [pos, anchor];
                for (let k = lo; k <= hi; k++) {
                    const o = displayToOrig[k];
                    if (o != null)
                        on ? selected.add(idOf(rows[o])) : selected.delete(idOf(rows[o]));
                }
            }
            else {
                on ? selected.add(id) : selected.delete(id);
            }
            anchor = pos;
            userEmptied = selected.size === 0;
            render();
            emitSel();
            return;
        }
        if (selCheckboxes) {
            const wasSoft = softSel.has(id);
            if (ev.shiftKey && softAnchor == null)
                softAnchor = anchorFrom(softSel);
            if (ev.shiftKey && softAnchor != null) {
                const [lo, hi] = softAnchor <= pos ? [softAnchor, pos] : [pos, softAnchor];
                for (let k = lo; k <= hi; k++) {
                    const o = displayToOrig[k];
                    if (o != null)
                        softSel.add(idOf(rows[o]));
                }
            }
            else if (ev.ctrlKey || ev.metaKey) {
                wasSoft ? softSel.delete(id) : softSel.add(id);
            }
            else {
                softSel = wasSoft && softSel.size === 1 ? new Set() : new Set([id]);
            }
            softAnchor = pos;
            userEmptied = softSel.size === 0; // seeding follows the SOFT layer in checkbox tables
            render();
            emitSoft();
            return;
        }
        if (selMode !== "single" && ev.shiftKey && anchor == null)
            anchor = anchorFrom(selected);
        if (selMode === "single") {
            selected = was ? new Set() : new Set([id]);
        }
        else if (ev.shiftKey && anchor != null) {
            const [lo, hi] = anchor <= pos ? [anchor, pos] : [pos, anchor];
            for (let k = lo; k <= hi; k++) {
                const o = displayToOrig[k];
                if (o != null)
                    selected.add(idOf(rows[o]));
            }
        }
        else if (ev.ctrlKey || ev.metaKey) {
            was ? selected.delete(id) : selected.add(id);
        }
        else {
            selected = was && selected.size === 1 ? new Set() : new Set([id]);
        }
        anchor = pos;
        userEmptied = selected.size === 0; // a click that emptied the selection is the user saying none
        render();
        emitSel();
    };
    const slotsFor = () => {
        const slots = [];
        const done = new Set();
        for (const c of cols) {
            const b = bandOf.get(c.id);
            if (b && collapsedBands.has(b.id)) {
                if (!done.has(b.id)) {
                    slots.push({ kind: "band", band: b });
                    done.add(b.id);
                }
            }
            else
                slots.push({ kind: "col", col: c });
        }
        return slots;
    };
    const bandValue = (band, row) => {
        if (band.representative) {
            const rc = cols.find((c) => c.id === band.representative);
            return { text: rc ? fmt(rc, row[rc.id]) : String(row[band.representative] ?? ""), mixed: false };
        }
        const vals = band.columns.map((cid) => String(row[cid] ?? ""));
        if (vals.every((v) => v === vals[0])) {
            const rc = cols.find((c) => c.id === band.columns[0]);
            return { text: rc ? fmt(rc, row[band.columns[0]]) : vals[0], mixed: false };
        }
        return { text: "", mixed: true };
    };
    // ---- targeted updaters (so a cell edit does NOT rebuild the table and destroy sibling editors /
    // focus). renderTotals rebuilds only <tfoot>; paintRowTone reapplies the row accent in place.
    const renderTotals = () => {
        const existing = table.querySelector("tfoot");
        if (!opts.totals) {
            existing?.remove();
            return;
        }
        const slots = slotsFor();
        const tfoot = el("tfoot");
        const tr = el("tr");
        if (selCheckboxes)
            tr.appendChild(el("td"));
        slots.forEach((slot, si) => {
            if (slot.kind === "band") {
                tr.appendChild(el("td", si === 0 ? idcol : ""));
                return;
            }
            const c = slot.col;
            const td = el("td", (si === 0 ? idcol : "") + (c.numeric ? " ds-num" : ""));
            if (si === 0)
                td.textContent = "Total";
            // Totals sum what is VISIBLE: a total over filtered-out rows describes a table nobody is
            // looking at, and reads as a bug in the filter.
            else if (c.numeric && c.total !== false)
                td.textContent = fmt(c, visibleRows().reduce((a, r) => a + (r[c.id] ?? 0), 0));
            else
                td.textContent = "";
            tr.appendChild(td);
        });
        tfoot.appendChild(tr);
        if (existing)
            table.replaceChild(tfoot, existing);
        else
            table.appendChild(tfoot);
    };
    const paintRowTone = (tr, row) => {
        for (const c of [...tr.classList])
            if (c.startsWith("ds-tone--") || c.startsWith("ds-rowtint"))
                tr.classList.remove(c);
        const tone = opts.rowTone?.(row);
        if (tone)
            tr.classList.add("ds-tone--" + tone);
        const tint = opts.rowTint?.(row);
        if (tint)
            tr.classList.add("ds-rowtint", "ds-rowtint--" + tint);
    };
    const slotId = (slot) => (slot.kind === "band" ? slot.band.id : slot.col.id);
    const render = () => {
        const keepScroll = wrap.scrollTop; // read before the table empties: a shortened scroller's scroll clamps to 0 at the next layout
        editors.disposeAll();
        grips.disposeAll();
        table.textContent = "";
        const slots = slotsFor();
        const span = slots.length + (selCheckboxes ? 1 : 0);
        let view = visibleRows();
        if (sort) {
            const s = sort;
            const c = cols.find((x) => x.id === s.id);
            view.sort((a, b) => {
                const av = a[s.id], bv = b[s.id];
                return (c?.numeric ? av - bv : String(av).localeCompare(String(bv))) * s.dir;
            });
        }
        // ---- widths live on a <colgroup>, not on the cells: with fixed layout one <col> governs the
        // whole column, so a drag writes ONE style property instead of touching every row.
        const colEls = [];
        if (opts.resizable) {
            const cg = el("colgroup");
            if (selCheckboxes) {
                const c = el("col");
                c.style.width = CHECK_COL_PX + "px"; // fixed layout would read the th's "1%" literally and crush the checkbox
                cg.appendChild(c);
            }
            slots.forEach((slot) => {
                const c = el("col");
                const w = widths.get(slotId(slot));
                if (w != null)
                    c.style.width = w + "px";
                cg.appendChild(c);
                colEls.push(c);
            });
            table.appendChild(cg);
        }
        const thead = el("thead");
        // ---- optional band super-header (contiguous runs of banded columns)
        if (bands.length) {
            const sup = el("tr", "ds-bandrow");
            if (selCheckboxes)
                sup.appendChild(el("th"));
            let idx = 0;
            while (idx < cols.length) {
                const b = bandOf.get(cols[idx].id);
                if (!b) {
                    sup.appendChild(el("th"));
                    idx++;
                    continue;
                }
                let run = 0;
                while (idx < cols.length && bandOf.get(cols[idx].id) === b) {
                    run++;
                    idx++;
                }
                const isCollapsed = collapsedBands.has(b.id);
                const th = el("th", "ds-band" + (b.tone ? " ds-tone--" + b.tone : ""));
                th.colSpan = isCollapsed ? 1 : run;
                th.append(el("span", "ds-band__caret", isCollapsed ? "▸" : "▾"), document.createTextNode(" " + b.label));
                th.style.cursor = "pointer";
                th.addEventListener("click", () => { collapsedBands.has(b.id) ? collapsedBands.delete(b.id) : collapsedBands.add(b.id); render(); });
                sup.appendChild(th);
            }
            thead.appendChild(sup);
        }
        // ---- column header row (over slots)
        const hr = el("tr");
        const headCells = []; // one per slot (never the selection checkbox cell)
        if (selCheckboxes) {
            const th = el("th", "");
            th.style.width = "1%";
            createCheckbox(th, {
                state: selected.size === 0 ? "off" : selected.size === visibleRows().length ? "on" : "partial",
                onChange: (s) => {
                    // Visible rows only: "all" means all of what the filter is showing (the PowerBI reading —
                    // selecting rows you cannot see is a selection you cannot inspect).
                    selected = s === "on" ? new Set(visibleRows().map((r) => idOf(r))) : new Set();
                    userEmptied = selected.size === 0;
                    render();
                    emitSel();
                },
            });
            hr.appendChild(th);
        }
        slots.forEach((slot, si) => {
            if (slot.kind === "band") {
                const th = el("th", (si === 0 && idcol ? idcol + " " : "") + "ds-band-head" + (slot.band.tone ? " ds-tone--" + slot.band.tone : ""));
                const rep = slot.band.representative ? cols.find((c) => c.id === slot.band.representative) : undefined;
                th.textContent = rep?.label ?? rep?.id ?? slot.band.label;
                hr.appendChild(th);
                headCells.push(th);
                return;
            }
            const c = slot.col;
            const th = el("th", (si === 0 && idcol ? idcol + " " : "") + (c.numeric ? "ds-num " : "") + (c.sortable ? "ds-sortable" : ""));
            th.setAttribute("scope", "col");
            // All / none lives in the FIRST header cell for a click-selected table: no extra column, and it
            // sits where the eye already goes to read what the rows are. Its own click must not sort.
            if (selAllNone && si === 0) {
                const box = el("span", "ds-th-allnone");
                box.addEventListener("click", (e) => e.stopPropagation());
                // No `label`: that would render TEXT into a header cell that already has a column name (and
                // any header-text matching downstream would then read the two as one string). The name a
                // screen reader needs goes on afterwards, as an attribute.
                const allBox = createCheckbox(box, {
                    state: selected.size === 0 ? "off" : selected.size === visibleRows().length ? "on" : "partial",
                    onChange: (s) => {
                        selected = s === "on" ? new Set(visibleRows().map((r) => idOf(r))) : new Set();
                        userEmptied = selected.size === 0;
                        render();
                        emitSel();
                    },
                });
                allBox.el.setAttribute("aria-label", "Select all rows");
                th.appendChild(box);
            }
            if (c.headerDot || c.headerIcon) {
                // Mark + label ride ONE inline-flex wrap, so a 9px dot, a font glyph of any size and the
                // uppercase label all centre on the same axis — vertical-align could never make the two
                // mark species agree (a dot is a box, a glyph sits on the text baseline).
                const wrapHd = el("span", "ds-thwrap");
                if (c.headerDot) {
                    const d = el("span", "ds-seldot");
                    d.style.background = c.headerDot;
                    wrapHd.appendChild(d);
                }
                if (c.headerIcon) {
                    // The glyph rides as CSS content (attr), NOT text: the header's textContent must stay the
                    // label alone — the funnel learned this rule first, and glyphs are text where marks aren't.
                    const ic = el("span", "ds-thicon");
                    ic.dataset.glyph = c.headerIcon;
                    if (c.headerIconColor)
                        ic.style.color = c.headerIconColor;
                    wrapHd.appendChild(ic);
                }
                wrapHd.appendChild(document.createTextNode(c.label ?? c.id));
                th.appendChild(wrapHd);
            }
            else
                th.appendChild(document.createTextNode(c.label ?? c.id));
            if (c.filter) {
                // Filled funnel = this column is filtering. An affordance that looks identical in both states
                // leaves a reader wondering why the table is short.
                const on = (excluded.get(c.id)?.size ?? 0) > 0 || cmpFilters.has(c.id);
                // CSS-drawn mark, no glyph and no TEXT: the header cell's textContent has to stay the column
                // label, or anything reading a label out of the DOM reads the decoration with it.
                const fun = el("span", "ds-thfilter" + (on ? " ds-on" : ""));
                fun.appendChild(el("span", "ds-thfilter__mark"));
                fun.setAttribute("role", "button");
                fun.tabIndex = 0;
                fun.setAttribute(DS_TIP_ATTR, on ? "Filtered — click to change" : "Filter by value");
                const open = (e) => { e.stopPropagation(); openFilterPop(c, fun); };
                fun.addEventListener("click", open);
                fun.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ")
                    open(e); });
                th.appendChild(fun);
            }
            if (sort?.id === c.id)
                th.appendChild(el("span", "ds-sortind", sort.dir > 0 ? "▲" : "▼"));
            if (c.sortable)
                th.setAttribute("aria-sort", sort?.id === c.id ? (sort.dir > 0 ? "ascending" : "descending") : "none");
            if (c.sortable)
                th.addEventListener("click", () => {
                    sort = sort?.id === c.id ? { id: c.id, dir: (-sort.dir) } : { id: c.id, dir: 1 };
                    anchor = null;
                    render();
                    opts.onSort?.(sort);
                });
            hr.appendChild(th);
            headCells.push(th);
        });
        // ---- pinned layout. With width:max-content the fixed algorithm never runs (the table lays
        // out auto, so a column can never go below its content). The moment ANY column has an explicit
        // width — a drag, a declared width, a restore — every column pins to a definite px width and
        // the table's width becomes their sum: fixed layout bites, a column shrinks below its content,
        // and the clipped cells ellipsize (CSS on ds-etable--pinned; the page tooltip binder shows the
        // full text on hover). min-width:100% still stretches a narrow table to its wrap.
        const pinLayout = () => {
            if (!opts.resizable)
                return;
            if (widths.size === 0) {
                table.classList.remove("ds-etable--pinned");
                table.style.width = "";
                colEls.forEach((c, i) => { if (widths.get(slotId(slots[i])) == null)
                    c.style.width = ""; });
                return;
            }
            let total = selCheckboxes ? CHECK_COL_PX : 0;
            const pin = [];
            for (let i = 0; i < slots.length; i++) {
                const id = slotId(slots[i]);
                let w = widths.get(id) ?? naturalWidths.get(id);
                if (w == null) {
                    w = Math.round(headCells[i].getBoundingClientRect().width);
                    if (w <= 0)
                        return; // detached host: nothing to measure — stay unpinned until a real layout
                    naturalWidths.set(id, w);
                }
                pin.push(w);
                total += w;
            }
            pin.forEach((w, i) => { if (w != null)
                colEls[i].style.width = w + "px"; });
            table.style.width = total + "px";
            table.classList.add("ds-etable--pinned");
        };
        // ---- one grip per interior boundary; each resizes the column to its LEFT.
        // HOST CHOICE IS A PAINT-ORDER DECISION, not a stylistic one. Header cells are sticky with
        // z-index 1, so the later sibling wins: a grip hosted on the LEFT cell would have its overhang
        // covered by the neighbour's opaque background and lose half its hit zone. So the grip lives on
        // the RIGHT-hand cell, anchored to its left edge. The identity column is the exception — it
        // paints at z-index 3 above every other header cell, so the first boundary's grip has to live on
        // IT (anchored right) or the identity column would swallow it. Both cases put the same 13px zone
        // around the same painted rule.
        if (opts.resizable) {
            for (let i = 0; i + 1 < headCells.length; i++) {
                const slot = slots[i];
                const id = slotId(slot);
                const col = slot.kind === "col" ? slot.col : undefined;
                const onIdentity = i === 0;
                const apply = (w) => {
                    const target = colEls[i];
                    if (w == null) {
                        widths.delete(id);
                        if (target)
                            target.style.width = "";
                    }
                    else {
                        widths.set(id, w);
                        if (target)
                            target.style.width = w + "px";
                    }
                    pinLayout(); // keep the table's definite width equal to the columns' sum
                    opts.onResize?.(id, w);
                };
                const off = columnGrip(onIdentity ? headCells[0] : headCells[i + 1], {
                    anchor: onIdentity ? "right" : "left",
                    min: col?.minWidth,
                    max: col?.maxWidth,
                    // Name the grip after what it resizes — "Resize" alone is meaningless read out of context.
                    label: "Resize " + (slot.kind === "col" ? (slot.col.label ?? slot.col.id) : slot.band.label),
                    // Measure when nothing is stored: a column sized by content has no number to start from,
                    // and starting from a guess makes the first stretch of the drag feel dead.
                    startWidth: () => widths.get(id) ?? headCells[i].getBoundingClientRect().width,
                    onResize: (w) => apply(w),
                    // Reset FORGETS the width (persistence drops it); in pinned layout the column then
                    // falls back to the natural width pinLayout remembered, so it still LOOKS content-sized.
                    onReset: () => apply(col?.width ?? null),
                });
                grips.track({ destroy: off });
            }
        }
        thead.appendChild(hr);
        table.appendChild(thead);
        // ---- body
        const tbody = el("tbody");
        const displayToOrig = [];
        const origOf = new Map(); // O(1) row→index instead of indexOf per row (was O(n²))
        rows.forEach((r, k) => origOf.set(r, k));
        // `pos` is the row's DISPLAY position in the sorted view (Shift ranges run over it).
        const buildRow = (row, pos) => {
            const tone = opts.rowTone?.(row);
            const tint = opts.rowTint?.(row);
            const rowId = idOf(row);
            const tr = el("tr", "ds-erow"
                + ((selCheckboxes ? softSel.has(rowId) : selected.has(rowId)) ? " ds-sel" : "")
                + (tone ? " ds-tone--" + tone : "")
                + (tint ? " ds-rowtint ds-rowtint--" + tint : ""));
            tr.dataset.rid = String(rowId); // revealRow finds the row by id
            if (selMode) {
                tr.setAttribute("aria-selected", String(selected.has(rowId)));
                tr.addEventListener("click", (e) => {
                    if (isInteractive(e.target))
                        return; // the control's click, not a selection gesture
                    clickRow(row, pos, displayToOrig, e);
                });
            }
            if (dragEnabled()) {
                tr.dataset.grp = row[opts.groupBy] == null ? "" : String(row[opts.groupBy]);
                tr.addEventListener("mousedown", (e) => {
                    if (e.button !== 0 || isInteractive(e.target))
                        return;
                    dragJustEnded = false; // a fresh press is a fresh gesture (see the drop's tail-click note)
                    dragPending = { row, x: e.clientX, y: e.clientY };
                });
            }
            if (opts.rowMenu)
                tr.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    menu ??= createMenu({});
                    menu.setItems(opts.rowMenu(row));
                    menu.openAt(e.clientX, e.clientY);
                });
            if (selCheckboxes) {
                const td = el("td", "ds-chkcell");
                td.style.width = "1%";
                td.addEventListener("mousedown", (e) => { shiftAtPress = e.shiftKey; });
                createCheckbox(td, {
                    state: selected.has(rowId) ? "on" : "off",
                    onChange: (s) => {
                        if (softSel.has(rowId)) {
                            // The promotion rule: soft is the staging, the checkbox the commit. Checking a box on
                            // a row INSIDE the soft selection carries the whole soft selection to that state.
                            for (const sid of softSel)
                                s === "on" ? selected.add(sid) : selected.delete(sid);
                        }
                        else if (shiftAtPress && anchor != null) {
                            const [lo, hi] = anchor <= pos ? [anchor, pos] : [pos, anchor];
                            for (let k = lo; k <= hi; k++) {
                                const o = displayToOrig[k];
                                if (o != null)
                                    s === "on" ? selected.add(idOf(rows[o])) : selected.delete(idOf(rows[o]));
                            }
                        }
                        else {
                            s === "on" ? selected.add(rowId) : selected.delete(rowId);
                        }
                        anchor = pos;
                        shiftAtPress = false;
                        render();
                        emitSel();
                    },
                });
                tr.appendChild(td);
            }
            slots.forEach((slot, si) => {
                if (slot.kind === "band") {
                    const td = el("td", (si === 0 && idcol ? idcol + " " : "") + "ds-band-cell" + (slot.band.tone ? " ds-tone--" + slot.band.tone : ""));
                    const { text, mixed } = bandValue(slot.band, row);
                    if (mixed)
                        td.appendChild(el("span", "ds-mixed", "mix"));
                    else
                        td.textContent = text;
                    tr.appendChild(td);
                    return;
                }
                const c = slot.col;
                const td = el("td", (si === 0 ? idcol : "") + (c.numeric ? " ds-num" : ""));
                const editable = opts.editableCell ? opts.editableCell(row, c.id) : !!c.editable;
                if (editable) {
                    const spec = opts.cellEditor?.(row, c.id) ?? { kind: c.numeric ? "number" : "text" };
                    // In-place commit: the editor already shows the new value, so DON'T full-render (that would
                    // destroy sibling editors + focus). Just refresh the dependent chrome. Cross-row effects
                    // (sort order, another row, a band's "mix" cell) are the consumer's refresh() call.
                    const commit = (v) => { row[c.id] = v; opts.onEdit?.(row, c.id, v); renderTotals(); paintRowTone(tr, row); };
                    const state = opts.cellState?.(row, c.id) ?? "clean";
                    if (spec.kind === "enum") {
                        const sel = editors.track(createSelect(td, { options: spec.options, value: row[c.id] == null ? null : String(row[c.id]), state, onChange: commit }));
                        sel.el.classList.add("ds-select--inline");
                    }
                    else if (spec.kind === "date") {
                        // The AS pairing, as one molecule: type the date OR pick it from the calendar popover.
                        const f = editors.track(createDateField(td, { value: row[c.id] == null ? "" : String(row[c.id]), onChange: commit }));
                        f.el.classList.add("ds-datefield--cell");
                    }
                    else if (spec.kind === "note") {
                        // The AS note cell: "+" while empty (revealed on row hover — an empty note is not worth
                        // ink in a dense table), a pencil once written. The pencil's TOOLTIP carries the note,
                        // so the column stays icon-narrow and the content is one hover away.
                        const btn = el("button", "ds-iconbtn ds-notebtn", "");
                        btn.type = "button";
                        const paint = (v) => {
                            const has = !!v;
                            btn.textContent = has ? "✎" : "+";
                            btn.classList.toggle("ds-active", has);
                            btn.classList.toggle("ds-notebtn--empty", !has);
                            btn.setAttribute("aria-label", has ? "Edit note" : "Add note");
                            if (has) {
                                btn.setAttribute(DS_TIP_ATTR, v);
                                btn.setAttribute(DS_TIP_DELAY_ATTR, "120");
                            }
                            else {
                                btn.removeAttribute(DS_TIP_ATTR);
                                btn.removeAttribute(DS_TIP_DELAY_ATTR);
                            }
                        };
                        paint(row[c.id] == null ? "" : String(row[c.id]));
                        btn.addEventListener("click", (e) => {
                            e.stopPropagation();
                            openNotePopover(btn, String(row[c.id] ?? ""), spec.placeholder, (v) => {
                                commit(v);
                                paint(v);
                            });
                        });
                        td.appendChild(btn);
                    }
                    else {
                        const format = spec.kind === "number" ? (spec.format ?? (c.numeric ? "int" : "float")) : undefined;
                        editors.track(createEditCell(td, { value: row[c.id], format, state, onEdit: commit }));
                        td.querySelector("input").style.textAlign = c.numeric ? "right" : "";
                    }
                }
                else if (c.render)
                    td.appendChild(c.render(row));
                else
                    td.textContent = fmt(c, row[c.id]);
                tr.appendChild(td);
            });
            return tr;
        };
        const addRow = (row) => {
            displayToOrig.push(origOf.get(row));
            tbody.appendChild(buildRow(row, displayToOrig.length - 1));
        };
        if (opts.loading) {
            for (let i = 0; i < 4; i++) {
                const tr = el("tr");
                const td = el("td", "ds-empty-cell");
                td.colSpan = span;
                const s = el("span", "ds-skeleton");
                s.style.display = "inline-block";
                s.style.height = "12px";
                s.style.width = 55 + (i % 3) * 12 + "%";
                td.appendChild(s);
                tr.appendChild(td);
                tbody.appendChild(tr);
            }
        }
        else {
            if (opts.groupBy && opts.groups) {
                // Group heads with behaviour — see TableOptions.groups. Built from the FILTERED view, so a
                // head's count is what is showing and a fully-filtered group does not render at all.
                const gb = opts.groupBy;
                const grouping = opts.groups;
                const groups = new Map();
                for (const r of view) {
                    const k = r[gb] == null ? "" : String(r[gb]);
                    if (!groups.has(k))
                        groups.set(k, []);
                    groups.get(k).push(r);
                }
                const entries = [...groups.entries()].sort((a, b) => (a[0] === "" ? 1 : 0) - (b[0] === "" ? 1 : 0) || a[0].localeCompare(b[0]));
                // No NAMED groups -> a flat table. A lone "Ungrouped" head over everything is a label for a
                // distinction that does not exist yet.
                if (entries.length === 1 && entries[0][0] === "") {
                    view.forEach(addRow);
                }
                else {
                    const slots = slotsFor();
                    for (const [k, list] of entries) {
                        const isCollapsed = collapsedGroups.has(k);
                        const tr = el("tr", "ds-grouphead");
                        if (dragEnabled())
                            tr.dataset.grp = k;
                        let labeled = false;
                        slots.forEach((slot, si) => {
                            const td = el("td", si === 0 ? idcol : "");
                            if (slot.kind === "col" && !labeled) {
                                labeled = true;
                                const caret = el("button", "ds-ghead__caret", isCollapsed ? "\u25b8" : "\u25be");
                                caret.type = "button";
                                caret.setAttribute("aria-label", (isCollapsed ? "Expand " : "Collapse ") + (k || grouping.ungroupedLabel || "Ungrouped"));
                                caret.addEventListener("click", (e) => {
                                    e.stopPropagation();
                                    isCollapsed ? collapsedGroups.delete(k) : collapsedGroups.add(k);
                                    render();
                                });
                                td.append(caret, el("span", "ds-ghead__label", k || (grouping.ungroupedLabel ?? "Ungrouped")), el("span", "ds-ghead__count", String(list.length)));
                            }
                            tr.appendChild(td);
                        });
                        // The head IS its members for selection: clicking it selects them all (Ctrl toggles them
                        // in or out of the wider selection) — which is what makes "look at this group" one click.
                        tr.addEventListener("click", (e) => {
                            if (isInteractive(e.target))
                                return;
                            const ids = list.map(idOf);
                            // The head selects its members into the layer body clicks drive: soft in soft-click
                            // checkbox tables (a glance at the group), the hard selection otherwise.
                            const layer = selSoft ? softSel : selected;
                            const all = ids.every((id2) => layer.has(id2));
                            let next;
                            if (e.ctrlKey) {
                                next = new Set(layer);
                                all ? ids.forEach((id2) => next.delete(id2)) : ids.forEach((id2) => next.add(id2));
                            }
                            else {
                                next = new Set(all && layer.size === ids.length ? [] : ids);
                            }
                            if (selMode === "single")
                                next = new Set([...next].slice(0, 1));
                            if (selSoft) {
                                softSel = next;
                                render();
                                emitSoft();
                            }
                            else {
                                selected = next;
                                render();
                                emitSel();
                            }
                        });
                        tbody.appendChild(tr);
                        if (!isCollapsed)
                            list.forEach(addRow);
                    }
                }
            }
            else if (opts.groupBy) {
                const groups = new Map();
                for (const r of view) {
                    const k = r[opts.groupBy];
                    if (!groups.has(k))
                        groups.set(k, []);
                    groups.get(k).push(r);
                }
                for (const [k, list] of groups) {
                    const band = el("tr", "ds-grpband");
                    const td = el("td");
                    td.colSpan = span;
                    const sums = cols.filter((c) => c.numeric).map((c) => `${c.label ?? c.id} Σ ${list.reduce((a, r) => a + (r[c.id] ?? 0), 0)}`).join("   ");
                    td.append(document.createTextNode(`${k} · ${list.length} `), el("span", "ds-grp-sub", sums));
                    band.appendChild(td);
                    tbody.appendChild(band);
                    list.forEach(addRow);
                }
            }
            else if (virtual) {
                for (const r of view)
                    displayToOrig.push(origOf.get(r));
                vView = view;
                vBody = tbody;
                vBuild = buildRow;
                vSpan = span;
                paintWindow(keepScroll);
            }
            else
                view.forEach(addRow);
            if (view.length === 0 && opts.empty != null) {
                const tr = el("tr");
                const td = el("td", "ds-empty-cell");
                td.colSpan = span;
                if (typeof opts.empty === "string")
                    td.textContent = opts.empty;
                else
                    td.appendChild(opts.empty);
                tr.appendChild(td);
                tbody.appendChild(tr);
            }
        }
        table.appendChild(tbody);
        if (virtual)
            wrap.scrollTop = keepScroll; // the body is whole again: put the scroll back where the user had it
        renderTotals(); // totals never depend on selection; also callable standalone after an edit
        rovingFocus(wrap, "tbody tr.ds-erow"); // ↑/↓ row navigation (data rows only)
        pinLayout(); // after the rows: natural widths are measured off the CONTENT-sized layout
    };
    render();
    return handle(wrap, {
        setRows: (next) => {
            // With rowKey the selection survives by identity; the display position of the first selected
            // row is remembered so `seedFirst` can slide to the nearest surviving neighbour when its row
            // vanished (what file managers do after a delete). Without rowKey, clearing is the only honest
            // option — indices would silently select whatever row inherited them.
            const prevFirstPos = rows.findIndex((r) => selected.has(idOf(r)));
            rows = [...next];
            anchor = null;
            softAnchor = null; // new data, new display positions — a held anchor would range over ghosts
            {
                const alive2 = new Set(rows.map((r) => idOf(r)));
                const softBefore2 = softSel.size;
                softSel = new Set([...softSel].filter((id) => alive2.has(id)));
                if (selSoft && selSeedFirst && softSel.size === 0 && rows.length > 0 && !userEmptied) {
                    softSel = new Set([idOf(rows[0])]); // the glance follows the data like the hard seed does
                }
                if (softSel.size !== softBefore2 || softBefore2 === 0)
                    queueMicrotask(emitSoft);
            }
            if (opts.rowKey) {
                const alive = new Set(rows.map((r) => idOf(r)));
                selected = new Set([...selected].filter((id) => alive.has(id)));
                // Seat a row when the selection is empty for a reason the USER did not choose: the first load,
                // or a prune that took the selected rows with it. A deliberate none is left alone. (Checkbox
                // tables seed the SOFT layer instead — see above — checkmarks are strictly user-made.)
                if (!selCheckboxes && selSeedFirst && selected.size === 0 && rows.length > 0 && !userEmptied) {
                    const at = Math.min(Math.max(prevFirstPos, 0), rows.length - 1);
                    selected = new Set([idOf(rows[at])]);
                    render();
                    emitSel();
                    return;
                }
            }
            else if (selected.size > 0) {
                selected = new Set();
                render();
                emitSel();
                return;
            }
            render();
        },
        setColumns: (next) => {
            cols = [...next];
            // A filter on a column that LEFT would keep hiding rows with nothing in the header to say so —
            // an invisible constraint. Filters on surviving columns are kept (that is the point of keying
            // them by column id).
            for (const id of [...excluded.keys()])
                if (!cols.some((c) => c.id === id))
                    excluded.delete(id);
            for (const id of [...cmpFilters.keys()])
                if (!cols.some((c) => c.id === id))
                    cmpFilters.delete(id);
            // Widths persist for surviving columns; a NEW column brings its declared width along.
            for (const c of cols)
                if (c.width != null && !widths.has(c.id))
                    widths.set(c.id, c.width);
            // A sort whose column left would point at nothing — clear it rather than sort by a ghost.
            if (sort && !cols.some((c) => c.id === sort.id))
                sort = null;
            render();
        },
        getSelected: () => selectedRows(),
        setSelected: (keys) => {
            const alive = new Set(rows.map((r) => idOf(r)));
            let next = new Set(keys.filter((k) => alive.has(k)));
            if (selMode === "single" && next.size > 1)
                next = new Set([keys.find((k) => alive.has(k))]);
            selected = next;
            userEmptied = selected.size === 0; // setSelected([]) is a caller asking for none
            render();
            emitSel();
        },
        clearSelection: () => {
            const had = selected.size > 0;
            selected.clear();
            userEmptied = true;
            render();
            // A silent clear leaves the consumer painting a selection that is gone — every other mutator
            // emits, and "the selection is now empty" is exactly the change a listener needs to hear.
            if (had)
                emitSel();
        },
        getSoftSelected: () => softRows(),
        getVisibleRowIds: () => visibleRows().map(idOf),
        revealRow: (id) => {
            const row = rows.find((r) => idOf(r) === id);
            if (!row || !visibleRows().some((r) => idOf(r) === id))
                return;
            if (virtual) {
                // The row may not be in the DOM: scroll by arithmetic, then cut the window so its <tr> exists.
                const pos = vView.findIndex((r) => idOf(r) === id);
                if (pos < 0)
                    return;
                const top = headH() + pos * virtual.rowHeight, bottom = top + virtual.rowHeight;
                if (top < wrap.scrollTop + headH())
                    wrap.scrollTop = top - headH();
                else if (bottom > wrap.scrollTop + wrap.clientHeight)
                    wrap.scrollTop = bottom - wrap.clientHeight;
                paintWindow();
                return;
            }
            // A collapsed group hides its member rows entirely — expand it before looking for the <tr>.
            if (opts.groupBy && opts.groups) {
                const raw = row[opts.groupBy];
                let expanded = false;
                for (const k of [raw, String(raw ?? "")])
                    if (collapsedGroups.has(k)) {
                        collapsedGroups.delete(k);
                        expanded = true;
                    }
                if (expanded)
                    render();
            }
            const target = wrap.querySelector('tr[data-rid="' + CSS.escape(String(id)) + '"]');
            target?.scrollIntoView({ block: "nearest" });
        },
        setSoftSelected: (ids, o) => {
            const alive = new Set(rows.map((r) => idOf(r)));
            softSel = new Set(ids.filter((id) => alive.has(id)));
            softAnchor = null; // a click's anchor must not outrank the selection this write installed
            userEmptied = selSoft ? softSel.size === 0 : userEmptied;
            render();
            if (o?.notify)
                emitSoft();
        },
        isFiltered: () => cmpFilters.size > 0 || [...excluded.values()].some((v) => v.size > 0),
        getVisibleRows: () => visibleRows(),
        clearFilters: () => {
            if (!excluded.size && !cmpFilters.size)
                return;
            excluded.clear();
            cmpFilters.clear();
            const changed = pruneSelectionToVisible();
            render();
            if (changed)
                emitSel();
        },
        getFilterState: () => filterStateOut(),
        refresh: () => render(), // force a full structural rebuild (order/cross-row/band reflow)
        getColumnWidths: () => Object.fromEntries(widths),
        setColumnWidths: (next) => {
            widths.clear();
            for (const [k, v] of Object.entries(next))
                widths.set(k, v);
            render();
        },
        setHeight: (px) => applyMaxH(px),
        destroy: () => {
            closeFilterPop();
            editors.disposeAll();
            grips.disposeAll();
            menu?.destroy();
            wrap.remove();
            offHeightGrip?.();
            heightBar?.remove();
            vRo?.disconnect();
            if (vRaf)
                cancelAnimationFrame(vRaf);
            if (opts.rowDrag) {
                dragCleanup();
                document.removeEventListener("mousemove", onDragMove, true);
                document.removeEventListener("mouseup", onDragUp, true);
                document.removeEventListener("keydown", onDragKey, true);
            }
        },
    });
}
// The standard "Select all" companion button for a checkbox table: soft-selects every row the
// current filters let through — the SELECT layer (blue rows / the glance), distinct from the
// header checkbox, which CHECKS all. Mount it in the table's own toolbar row; one line per table.
export function createTableSelectAll(host, table, opts = {}) {
    const btn = el("button", "ds-btn", opts.label ?? "Select all");
    btn.type = "button";
    btn.setAttribute("data-ds-tip", "Select every visible row (the header checkbox checks them instead)");
    btn.addEventListener("click", () => table.setSoftSelected(table.getVisibleRowIds(), { notify: true }));
    host.appendChild(btn);
    return handle(btn, {});
}
