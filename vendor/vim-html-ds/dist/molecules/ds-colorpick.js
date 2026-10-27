import { el, handle, clampFixed, onClickOutside, registerDismissable } from "../dom.js";
import { createInput } from "../atoms/ds-input.js";
import { createSegmented } from "../atoms/ds-segmented.js";
import { DS_TIP_ATTR } from "../atoms/ds-tooltip.js";
const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
const toRgba = (v) => v ? [clamp01(v[0] ?? 0), clamp01(v[1] ?? 0), clamp01(v[2] ?? 0), clamp01(v[3] ?? 1)] : [1, 1, 1, 1];
const byte = (n) => Math.round(clamp01(n) * 255);
const cssOf = (c) => `rgba(${byte(c[0])}, ${byte(c[1])}, ${byte(c[2])}, ${c[3]})`;
const hexOf = (c) => "#" + [c[0], c[1], c[2]].map((n) => byte(n).toString(16).padStart(2, "0")).join("").toUpperCase();
// Every colour the CONTROLS produce lands on a 1/255 step, so the notations agree with one another
// and hex round-trips exactly. A value handed in by the caller is never re-quantized.
const quant = (n) => Math.round(clamp01(n) * 255) / 255;
const pct = (f) => Math.round(clamp01(f) * 10000) / 100 + "%";
// ---- notation ----------------------------------------------------------------------------------
const HEX_DIGITS = /^[0-9a-fA-F]+$/;
const NUMBER_TOKEN = /^\d+\.?\d*$|^\.\d+$/;
/**
 * Parse a whole colour written in any of the three notations, or return null (the caller keeps the
 * value it had). The rules, in order:
 *
 * - **Hex** — `#RRGGBB` / `#RRGGBBAA`, the `#` optional; `#RGB` / `#RGBA` shorthand REQUIRES the
 *   `#`, so a bare `255` stays a single channel number rather than becoming `#225555`.
 * - **List** — three or four numbers separated by commas (or spaces). A list holding any value
 *   above 1 is 0-255 integers; otherwise it is 0.0-1.0 decimals if at least one value carries a
 *   decimal point, and 0-255 integers if none does (so `1,0,0` is near-black, `1.0,0,0` is red).
 * - A missing alpha is fully opaque. Rejected: a value past the top of its notation's range, a
 *   negative, a fraction in a 0-255 list, and any other token count — a LONE number included, which
 *   is what lets a per-channel box tell "the whole colour was pasted" from "this channel was typed".
 */
export function parseColorText(text) {
    const t = text.trim();
    if (!t)
        return null;
    return parseHexText(t) ?? parseListText(t);
}
function parseHexText(t) {
    const hashed = t.startsWith("#");
    const h = hashed ? t.slice(1) : t;
    if (!HEX_DIGITS.test(h))
        return null;
    if (!(h.length === 6 || h.length === 8 || (hashed && (h.length === 3 || h.length === 4))))
        return null;
    const wide = h.length <= 4 ? h.split("").map((c) => c + c).join("") : h;
    const at = (i) => parseInt(wide.slice(i * 2, i * 2 + 2), 16) / 255;
    return [at(0), at(1), at(2), wide.length === 8 ? at(3) : 1];
}
function parseListText(t) {
    const parts = t.split(/[\s,]+/).filter(Boolean);
    if (parts.length < 3 || parts.length > 4)
        return null;
    if (!parts.every((p) => NUMBER_TOKEN.test(p)))
        return null;
    const nums = parts.map(Number);
    const decimals = !nums.some((n) => n > 1) && parts.some((p) => p.includes("."));
    const scale = decimals ? 1 : 255;
    if (nums.some((n) => n > scale))
        return null;
    // A 0-255 list holds whole numbers; a fraction in one means the list was never in that notation.
    if (!decimals && nums.some((n) => n % 1 !== 0))
        return null;
    const at = (i) => nums[i] / scale;
    return [at(0), at(1), at(2), nums.length === 4 ? at(3) : 1];
}
/**
 * Parse ONE channel box: a whole 0-255 number in `"int"`, a 0.0-1.0 number in `"float"`. Returns the
 * channel as a 0..1 float, or null when the text is not a number of that notation.
 */
export function parseChannelText(text, notation) {
    if (notation === "hex")
        return null;
    const t = text.trim();
    if (!NUMBER_TOKEN.test(t))
        return null;
    const n = Number(t);
    if (notation === "int")
        return n <= 255 && n % 1 === 0 ? n / 255 : null;
    return n <= 1 ? n : null;
}
/** Write `v` in one notation — the text the hex box shows. `alpha` off drops the 4th channel. */
export function formatColorText(v, notation, alpha = true) {
    const chans = alpha ? [v[0], v[1], v[2], v[3]] : [v[0], v[1], v[2]];
    if (notation === "hex")
        return "#" + chans.map((n) => byte(n).toString(16).padStart(2, "0")).join("").toUpperCase();
    return chans.map((n) => (notation === "int" ? String(byte(n)) : clamp01(n).toFixed(3))).join(", ");
}
/** Write ONE channel the way its box shows it: a 0-255 byte, or a 0.0-1.0 number to three places. */
export function formatChannelText(n, notation) {
    return notation === "int" ? String(byte(n)) : clamp01(n).toFixed(3);
}
const CHANNEL_KEYS = ["R", "G", "B", "A"];
const CHANNEL_NAMES = ["Red", "Green", "Blue", "Alpha"];
const HEX_TIP = "Type #RRGGBB or #RRGGBBAA — or paste 0-255 integers (255, 0, 0) or 0.0-1.0 decimals "
    + "(1.0, 0.0, 0.0); a list with a value above 1 reads as 0-255, and an all-0/1 list reads as "
    + "decimals only when a value carries a decimal point. Enter or leaving the box commits.";
const CHANNEL_TIP = "This channel on its own — or paste a whole colour (#RRGGBBAA, or r, g, b, a in "
    + "either range) into any box and all of them follow. ↑/↓ nudge one step, Shift ten; Enter or "
    + "leaving the box commits.";
// ---- HSV ---------------------------------------------------------------------------------------
// Every channel is 0..1, hue included, so the plane, the strips and the arrow keys all move in the
// same 1/255 unit.
function rgbToHsv(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d > 0) {
        if (max === r)
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g)
            h = ((b - r) / d + 2) / 6;
        else
            h = ((r - g) / d + 4) / 6;
    }
    return [h, max === 0 ? 0 : d / max, max];
}
function hsvToRgb(h, s, v) {
    const sector = Math.floor(h * 6) % 6;
    const f = h * 6 - Math.floor(h * 6);
    const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    const wheel = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]];
    return wheel[sector];
}
/**
 * Colour picker: a trigger showing the current colour, and a popup holding a saturation × brightness
 * plane for the current hue, a hue strip, an alpha strip (with `alpha`), a live preview, and — with
 * `channels` — the numeric entry: HEX as one box, 255 and 1.0 as one box per channel.
 *
 * OSR-safe like ds-select: the popup is position:fixed on document.body at the DS menu layer, so it
 * is never clipped by a scrolling ancestor and always paints above a modal backdrop; drags track
 * `document` rather than taking pointer capture.
 *
 * Commits: a drag release, an arrow key, and an entry box's Enter / blur all call `onChange`; a drag
 * in flight calls `onInput`. Escape closes the popup and drops an uncommitted edit in a box — what
 * is already committed stands.
 */
export function createColorPicker(host, opts = {}) {
    let value = toRgba(opts.value);
    let hue = 0, sat = 0, val = 1;
    let notation = opts.notation ?? "hex";
    let parts = null;
    let stopDrag = null;
    const withAlpha = !!opts.alpha;
    const root = el("button", "ds-colorpick");
    root.type = "button";
    const chip = el("span", "ds-colorpick__chip");
    const text = el("span", "ds-colorpick__text");
    root.append(chip, text);
    host.appendChild(root);
    const pop = el("div", "ds-colorpop");
    document.body.appendChild(pop);
    let unbind = null;
    let unregister = null;
    const syncHsv = () => {
        const [h, s, v] = rgbToHsv(value[0], value[1], value[2]);
        // Grey has no hue and black has no saturation — keep the ones the user last chose, or the
        // marker would jump home whenever the colour passes an edge of the plane.
        if (s > 0 && v > 0)
            hue = h;
        if (v > 0)
            sat = s;
        val = v;
    };
    syncHsv();
    const paint = () => {
        chip.style.background = cssOf(value);
        text.textContent = withAlpha ? `${hexOf(value)} ${Math.round(value[3] * 100)}%` : hexOf(value);
    };
    const markInvalid = (input, bad) => {
        input.classList.toggle("ds-invalid", bad);
        input.setAttribute("aria-invalid", bad ? "true" : "false");
    };
    const textFor = (chan) => chan < 0 ? formatColorText(value, notation, withAlpha) : formatChannelText(value[chan], notation);
    const paintPop = () => {
        if (!parts)
            return;
        const solid = `rgb(${byte(value[0])}, ${byte(value[1])}, ${byte(value[2])})`;
        // The plane's hue rides under a white (left→right) and a black (bottom→top) wash — written from
        // here so the hue lives in exactly one place, the HSV state.
        parts.area.style.background = "linear-gradient(to top, #000000, rgba(0,0,0,0)), "
            + "linear-gradient(to right, #FFFFFF, rgba(255,255,255,0)), "
            + `hsl(${Math.round(hue * 360)}, 100%, 50%)`;
        parts.areaMark.style.left = pct(sat);
        parts.areaMark.style.top = pct(1 - val);
        parts.hueMark.style.left = pct(hue);
        parts.hueStrip.setAttribute("aria-valuenow", String(Math.round(hue * 360)));
        if (parts.alphaFill && parts.alphaMark && parts.alphaStrip) {
            parts.alphaFill.style.background =
                `linear-gradient(to right, rgba(${byte(value[0])}, ${byte(value[1])}, ${byte(value[2])}, 0), ${solid})`;
            parts.alphaMark.style.left = pct(value[3]);
            parts.alphaStrip.setAttribute("aria-valuenow", String(byte(value[3])));
        }
        parts.previewFill.style.background = cssOf(value);
        for (const f of parts.fields) {
            f.input.value = textFor(f.chan);
            markInvalid(f.input, false);
        }
    };
    const emit = (commit) => {
        paint();
        paintPop();
        (commit ? opts.onChange : opts.onInput)?.([...value]);
    };
    // The plane and the hue strip own the HSV state; the RGBA follows from it.
    const applyHsv = (commit) => {
        const [r, g, b] = hsvToRgb(hue, sat, val);
        value = [quant(r), quant(g), quant(b), value[3]];
        emit(commit);
    };
    // The entry and setValue speak RGBA; the HSV state follows from it.
    const applyRgba = (next, commit) => {
        value = next;
        syncHsv();
        emit(commit);
    };
    function close() {
        pop.classList.remove("ds-open");
        root.classList.remove("ds-open");
        if (stopDrag) {
            stopDrag();
            stopDrag = null;
        }
        if (unbind) {
            unbind();
            unbind = null;
        }
        if (unregister) {
            unregister();
            unregister = null;
        }
        parts = null;
    }
    // A box takes a WHOLE colour first — pasting `#RRGGBBAA` or `r, g, b, a` into any of them sets
    // everything, which keeps the one-box habit alive — and only then its own channel.
    const commitField = (input, chan) => {
        const whole = parseColorText(input.value);
        if (whole) {
            applyRgba([quant(whole[0]), quant(whole[1]), quant(whole[2]),
                withAlpha ? quant(whole[3]) : value[3]], true);
            return;
        }
        const one = chan < 0 ? null : parseChannelText(input.value, notation);
        if (one === null) {
            markInvalid(input, true);
            return;
        }
        const next = [...value];
        next[chan] = quant(one);
        applyRgba(next, true);
    };
    const makeField = (fieldHost, chan) => {
        const input = createInput(fieldHost, { variant: "mono" }).el;
        input.classList.add("ds-colorpop__field");
        input.setAttribute("aria-label", chan < 0 ? "Colour value" : CHANNEL_NAMES[chan]);
        input.setAttribute(DS_TIP_ATTR, chan < 0 ? HEX_TIP : CHANNEL_TIP);
        input.addEventListener("change", () => commitField(input, chan));
        input.addEventListener("keydown", (e) => {
            if (chan < 0)
                return;
            const dir = e.key === "ArrowUp" ? 1 : e.key === "ArrowDown" ? -1 : 0;
            if (!dir)
                return;
            e.preventDefault();
            // One step is 1/255 in BOTH numeric notations: it is the finest difference a colour holds, so
            // a 0.001 nudge in the 1.0 notation would as often as not leave the colour where it was.
            const next = [...value];
            next[chan] = quant(clamp01(value[chan] + dir * (e.shiftKey ? 10 : 1) / 255));
            applyRgba(next, true);
        });
        return input;
    };
    // HEX is one box for the whole colour; 255 and 1.0 are one box per channel, each with its letter.
    const buildInputs = () => {
        if (!parts)
            return;
        const box = parts.inputs;
        if (!box)
            return;
        box.textContent = "";
        const fields = [];
        if (notation === "hex") {
            fields.push({ input: makeField(box, -1), chan: -1 });
        }
        else {
            for (let i = 0; i < (withAlpha ? 4 : 3); i++) {
                const cell = el("label", "ds-colorpop__chan");
                cell.appendChild(el("span", "ds-colorpop__chanlabel", CHANNEL_KEYS[i]));
                box.appendChild(cell);
                fields.push({ input: makeField(cell, i), chan: i });
            }
        }
        parts.fields = fields;
    };
    // Drag on a surface: the pointer position as a 0..1 fraction of it. No setPointerCapture — OSR
    // drops capture the moment the cursor leaves the element, so the drag tracks `document`.
    const track = (node, at) => {
        const read = (e, done) => {
            const r = node.getBoundingClientRect();
            at(r.width ? clamp01((e.clientX - r.left) / r.width) : 0, r.height ? clamp01((e.clientY - r.top) / r.height) : 0, done);
        };
        node.addEventListener("pointerdown", (e) => {
            if (e.button !== 0)
                return;
            e.preventDefault();
            node.focus();
            const move = (ev) => read(ev, false);
            const up = (ev) => {
                document.removeEventListener("pointermove", move);
                stopDrag = null;
                read(ev, true);
            };
            stopDrag = () => {
                document.removeEventListener("pointermove", move);
                document.removeEventListener("pointerup", up);
            };
            document.addEventListener("pointermove", move);
            document.addEventListener("pointerup", up, { once: true });
            read(e, false);
        });
    };
    // Arrows nudge by one 1/255 step, Shift by ten. Each nudge commits, the way a slider's arrow key
    // fires change as well as input.
    const nudge = (node, step) => {
        node.addEventListener("keydown", (e) => {
            const d = (e.shiftKey ? 10 : 1) / 255;
            const dx = e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0;
            const dy = e.key === "ArrowDown" ? -d : e.key === "ArrowUp" ? d : 0;
            if (!dx && !dy)
                return;
            e.preventDefault();
            step(dx, dy);
        });
    };
    const buildStrip = (body, kind) => {
        const strip = el("div", "ds-colorstrip ds-colorstrip--" + kind);
        strip.tabIndex = 0;
        strip.setAttribute("role", "slider");
        strip.setAttribute("aria-label", kind === "hue" ? "Hue" : "Alpha");
        strip.setAttribute("aria-valuemin", "0");
        strip.setAttribute("aria-valuemax", kind === "hue" ? "360" : "255");
        const mark = el("span", "ds-colorstrip__marker");
        body.appendChild(strip);
        return { strip, mark };
    };
    const build = () => {
        pop.textContent = "";
        const body = el("div", "ds-colorpop__body");
        pop.appendChild(body);
        // No ARIA role describes a two-axis plane; the label names it and the entry carries the value a
        // reader needs.
        const area = el("div", "ds-colorarea");
        area.tabIndex = 0;
        area.setAttribute("aria-label", "Saturation and brightness");
        const areaMark = el("span", "ds-colorarea__marker");
        area.appendChild(areaMark);
        body.appendChild(area);
        const hueBits = buildStrip(body, "hue");
        hueBits.strip.appendChild(hueBits.mark);
        let alphaStrip = null, alphaFill = null;
        let alphaMark = null;
        if (withAlpha) {
            const bits = buildStrip(body, "alpha");
            alphaStrip = bits.strip;
            alphaMark = bits.mark;
            alphaFill = el("span", "ds-colorstrip__fill");
            alphaStrip.append(alphaFill, alphaMark);
        }
        const entry = el("div", "ds-colorpop__entry");
        pop.appendChild(entry);
        const preview = el("span", "ds-colorpop__preview");
        const previewFill = el("span", "ds-colorpop__fill");
        preview.appendChild(previewFill);
        entry.appendChild(preview);
        let inputs = null;
        if (opts.channels) {
            inputs = el("div", "ds-colorpop__inputs");
            entry.appendChild(inputs);
            const modes = el("div", "ds-colorpop__modes");
            pop.appendChild(modes);
            createSegmented(modes, {
                options: [{ id: "hex", label: "HEX" }, { id: "int", label: "255" }, { id: "float", label: "1.0" }],
                value: notation,
                onChange: (v) => { notation = v; buildInputs(); paintPop(); },
            });
        }
        parts = { area, areaMark, hueStrip: hueBits.strip, hueMark: hueBits.mark,
            alphaStrip, alphaFill, alphaMark, previewFill, inputs, fields: [] };
        buildInputs();
        track(area, (fx, fy, done) => { sat = quant(fx); val = quant(1 - fy); applyHsv(done); });
        nudge(area, (dx, dy) => { sat = quant(clamp01(sat + dx)); val = quant(clamp01(val + dy)); applyHsv(true); });
        track(hueBits.strip, (fx, _fy, done) => { hue = fx; applyHsv(done); });
        // Hue is a circle: a nudge past either end comes round the other side.
        nudge(hueBits.strip, (dx) => { hue = (hue + dx + 1) % 1; applyHsv(true); });
        if (alphaStrip) {
            track(alphaStrip, (fx, _fy, done) => { applyRgba([value[0], value[1], value[2], quant(fx)], done); });
            nudge(alphaStrip, (dx) => {
                applyRgba([value[0], value[1], value[2], quant(clamp01(value[3] + dx))], true);
            });
        }
        paintPop();
    };
    pop.addEventListener("keydown", (e) => {
        if (e.key !== "Escape")
            return;
        e.preventDefault();
        e.stopPropagation();
        close();
        root.focus();
    });
    root.addEventListener("click", () => {
        if (pop.classList.contains("ds-open")) {
            close();
            return;
        }
        build();
        pop.classList.add("ds-open");
        root.classList.add("ds-open");
        const r = root.getBoundingClientRect();
        clampFixed(pop, r.left, r.bottom + 2);
        unregister = registerDismissable(close); // a press over the 3D closes it via the host broadcast
        // Bound after this click finishes, or the click that opened it would close it immediately.
        setTimeout(() => { unbind = onClickOutside([pop, root], close); }, 0);
    });
    paint();
    // The extras get their own binding so the generic infers from THEM; inferring against the
    // declared return type instead makes TypeScript demand DsHandle's own members here.
    const extras = {
        getValue: () => [...value],
        setValue: (v) => {
            value = toRgba(v);
            syncHsv();
            paint();
            paintPop();
        },
        close,
        destroy: () => { close(); pop.remove(); root.remove(); },
    };
    return handle(root, extras);
}
