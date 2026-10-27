import { el, handle, onClickOutside, registerDismissable } from "../dom.js";
const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]; // Sunday-first
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad2 = (n) => (n < 10 ? "0" : "") + n;
const isoOf = (y, m, d) => y + "-" + pad2(m) + "-" + pad2(d);
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dowOf1st = (y, m) => new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
const parseIso = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m)
        return null;
    const p = { y: +m[1], m: +m[2], d: +m[3] };
    return p.m >= 1 && p.m <= 12 && p.d >= 1 && p.d <= daysInMonth(p.y, p.m) ? p : null;
};
const todayIso = () => {
    const t = new Date();
    return isoOf(t.getFullYear(), t.getMonth() + 1, t.getDate());
};
/** The big header label: "Mon, Jun 15" (year appended when it isn't this year), or a prompt. */
const bigLabel = (iso) => {
    const p = parseIso(iso);
    if (!p)
        return "Pick a date";
    const dt = new Date(Date.UTC(p.y, p.m - 1, p.d));
    const base = DAYS_SHORT[dt.getUTCDay()] + ", " + MONTHS_SHORT[p.m - 1] + " " + p.d;
    return p.y === new Date().getFullYear() ? base : base + " " + p.y;
};
function buildCore(root, o) {
    const start = parseIso(o.value) ?? parseIso(todayIso());
    let viewYear = start.y;
    let viewMonth = start.m;
    let current = parseIso(o.value) ? o.value.slice(0, 10) : "";
    let yearGrid = false;
    const nav = el("div", "ds-dp__nav");
    const monthBtn = el("button", "ds-btn ds-dp__month");
    monthBtn.type = "button";
    const prev = el("button", "ds-iconbtn ds-dp__arrow", "‹");
    const next = el("button", "ds-iconbtn ds-dp__arrow", "›");
    prev.type = next.type = "button";
    nav.append(monthBtn, prev, next);
    const body = el("div", "ds-dp__body");
    root.append(nav, body);
    const render = () => {
        monthBtn.textContent = MONTHS[viewMonth - 1] + " " + viewYear + (yearGrid ? " ▴" : " ▾");
        prev.style.display = next.style.display = yearGrid ? "none" : ""; // arrows are month nav only
        body.replaceChildren();
        if (yearGrid) {
            const scroll = el("div", "ds-dp__years");
            for (let y = o.yearMin; y <= o.yearMax; y++) {
                const b = el("button", "ds-dp__year" + (y === viewYear ? " ds-active" : ""), String(y));
                b.type = "button";
                b.addEventListener("click", () => { viewYear = y; yearGrid = false; render(); });
                scroll.appendChild(b);
            }
            body.appendChild(scroll);
            const sel = scroll.querySelector(".ds-dp__year.ds-active");
            if (sel)
                scroll.scrollTop = Math.max(0, sel.offsetTop - scroll.clientHeight / 2);
        }
        else {
            const grid = el("div", "ds-dp__grid");
            for (const w of WEEKDAY_LETTERS)
                grid.appendChild(el("span", "ds-dp__dow", w));
            for (let i = 0; i < dowOf1st(viewYear, viewMonth); i++)
                grid.appendChild(el("span", "ds-dp__blank"));
            const today = parseIso(todayIso());
            const cur = parseIso(current);
            for (let d = 1; d <= daysInMonth(viewYear, viewMonth); d++) {
                const isSel = !!cur && cur.y === viewYear && cur.m === viewMonth && cur.d === d;
                const isToday = today.y === viewYear && today.m === viewMonth && today.d === d;
                const b = el("button", "ds-dp__day" + (isSel ? " ds-active" : "") +
                    (isToday && !isSel ? " ds-dp__day--today" : ""), String(d));
                b.type = "button";
                b.addEventListener("click", () => {
                    current = isoOf(viewYear, viewMonth, d);
                    render();
                    o.onPick(current);
                });
                grid.appendChild(b);
            }
            body.appendChild(grid);
        }
    };
    monthBtn.addEventListener("click", () => { yearGrid = !yearGrid; render(); });
    prev.addEventListener("click", () => { viewMonth--; if (viewMonth < 1) {
        viewMonth = 12;
        viewYear--;
    } render(); });
    next.addEventListener("click", () => { viewMonth++; if (viewMonth > 12) {
        viewMonth = 1;
        viewYear++;
    } render(); });
    return {
        render,
        get: () => current,
        set: (iso) => {
            current = parseIso(iso) ? iso.slice(0, 10) : "";
            const p = parseIso(current);
            if (p) {
                viewYear = p.y;
                viewMonth = p.m;
            }
            render();
        },
    };
}
/** The INLINE calendar: always visible, a day click commits immediately; Clear commits "". */
export function createDatePicker(host, opts = {}) {
    const root = el("div", "ds-datepicker");
    const core = buildCore(root, {
        value: opts.value ?? "",
        yearMin: opts.yearMin ?? 1900,
        yearMax: opts.yearMax ?? 2100,
        immediate: true,
        onPick: (iso) => { syncClear(); opts.onChange?.(iso); },
        onClear: () => { },
    });
    const foot = el("div", "ds-dp__foot");
    const clearBtn = el("button", "ds-btn", "Clear");
    clearBtn.type = "button";
    foot.append(clearBtn, el("span", "ds-dp__spring"));
    root.appendChild(foot);
    const syncClear = () => { clearBtn.style.display = core.get() ? "" : "none"; };
    clearBtn.addEventListener("click", () => { core.set(""); syncClear(); opts.onChange?.(""); });
    core.render();
    syncClear();
    host.appendChild(root);
    return handle(root, {
        getValue: () => core.get(),
        setValue: (iso) => { core.set(iso); syncClear(); },
    });
}
/** The POPOVER form (the full AS anatomy): tentative until OK; Clear commits ""; Cancel, outside
 *  click, and Escape discard. Sized to content — never scrollbars. */
export function openDatePicker(anchor, opts) {
    const pop = el("div", "ds-datepicker ds-datepicker--pop");
    pop.append(el("div", "ds-dp__eyebrow", "SELECT DATE"));
    const big = el("div", "ds-dp__big");
    pop.appendChild(big);
    const core = buildCore(pop, {
        value: opts.value ?? "",
        yearMin: opts.yearMin ?? 1900,
        yearMax: opts.yearMax ?? 2100,
        immediate: false,
        onPick: () => sync(),
        onClear: () => { },
    });
    const foot = el("div", "ds-dp__foot");
    const clearBtn = el("button", "ds-btn", "Clear");
    const cancelBtn = el("button", "ds-btn", "Cancel");
    const okBtn = el("button", "ds-btn ds-btn--primary", "OK");
    clearBtn.type = cancelBtn.type = okBtn.type = "button";
    foot.append(clearBtn, el("span", "ds-dp__spring"), cancelBtn, okBtn);
    pop.appendChild(foot);
    document.body.appendChild(pop);
    // Clamp to the viewport, twice: once now, once next frame — the calendar's grid can widen after
    // the first measure, and a stale width lets the popup slip off the right edge. Flips above the
    // anchor when the space below is too short.
    const place = () => {
        const r = anchor.getBoundingClientRect();
        const w = pop.offsetWidth, h = pop.offsetHeight;
        let top = r.bottom + 2;
        if (top + h > window.innerHeight - 8)
            top = Math.max(8, r.top - h - 2);
        pop.style.left = Math.max(4, Math.min(r.left, window.innerWidth - w - 8)) + "px";
        pop.style.top = Math.max(4, Math.min(top, window.innerHeight - h - 8)) + "px";
    };
    place();
    requestAnimationFrame(place);
    const sync = () => {
        big.textContent = bigLabel(core.get());
        clearBtn.style.display = core.get() ? "" : "none";
    };
    let closed = false;
    const close = (commit, value) => {
        if (closed)
            return;
        closed = true;
        unbindOutside();
        unregister();
        pop.remove();
        if (commit)
            opts.onCommit(value);
        else
            opts.onCancel?.();
    };
    const unbindOutside = onClickOutside([pop], () => close(false, ""));
    const unregister = registerDismissable(() => close(false, "")); // a press over the 3D closes it
    clearBtn.addEventListener("click", () => close(true, ""));
    cancelBtn.addEventListener("click", () => close(false, ""));
    okBtn.addEventListener("click", () => close(true, core.get()));
    pop.addEventListener("keydown", (e) => { if (e.key === "Escape") {
        e.stopPropagation();
        close(false, "");
    } });
    core.render();
    sync();
    return handle(pop, { close: () => close(false, "") });
}
