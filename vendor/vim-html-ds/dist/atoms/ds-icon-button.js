import { el, handle } from "../dom.js";
import { DS_TIP_ATTR } from "./ds-tooltip.js";
// icon: "browse" (…) | "folder" (CSS glyph) | "chevron-up"/"chevron-down"/"chevron-left"/"chevron-right" (DRAWN —
// a rotated border corner, no glyph text) | "palette"/"shuffle"/"edit"/"menu"/"arrow-up"/"arrow-down"/
// "views-two"/"views-one" (DRAWN — an inline SVG
// path, no glyph text) | a name from ICON_GLYPHS (an icon-font character: clear, play, pause, eraser, …) |
// any literal glyph text.
const NS = "http://www.w3.org/2000/svg";
/** Named icon-font characters (FluentUI System Icons codepoints, drawn by `--font-icon`, or by
 *  `--font-icon-filled` for a name in FILLED_GLYPHS). Consumers name the icon; the codepoint lives
 *  here once. Also usable as `createIcon({ glyph: ICON_GLYPHS.add })`. */
export const ICON_GLYPHS = {
    add: "\uF108", // add_16_regular
    more: "\uE823", // more_horizontal_16_regular
    back: "\uF184", // arrow_left_16_regular
    copy: "\uF32A", // copy_16_regular
    download: "\uF14F", // arrow_download_16_regular
    filter: "\uE456", // data_funnel_20_regular
    eye: "\u{F0AF1}", // eye_circle_16_filled
    "eye-off": "\uE5F4", // eye_off_16_regular
    // Name the codepoint: a lookalike the font does not carry (× U+00D7) renders in a text font and
    // lands low in the square.
    clear: "\uF368", // dismiss_16_regular
    play: "\uE990", // play_16_regular
    pause: "\uF5A0", // pause_16_regular
    eraser: "\uE5E4", // eraser_20_regular — the "back to the default value" gesture
    eyedropper: "\uF0E6", // eyedropper_16_regular — the "take what is already there" gesture
    lock: "\uE78E", // lock_closed_16_regular
    unlock: "\uE794", // lock_open_16_regular
    "chevron-down-glyph": "\uF2A1", // chevron_down_12_regular
};
const isGlyphName = (s) => Object.prototype.hasOwnProperty.call(ICON_GLYPHS, s);
/** The names whose glyph is in the Filled font. The two Fluent fonts reuse the same codepoints, so
 *  the character alone does not say which drawing it is; the font family does. */
export const FILLED_GLYPHS = new Set(["eye"]);
// Drawn SVG icons: one filled path in a 24-unit box, painted with currentColor so the button's
// hover / active / disabled states carry into the icon. No icon font available to an OSR page
// carries the painter's palette or the crossing-arrows shuffle.
const SVG_PATHS = {
    // Painter's palette: the blob, with its four paint wells knocked out (evenodd) so the icon reads
    // at 14px without a second colour.
    palette: {
        evenodd: true,
        d: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01" +
            "-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z" +
            "M5 11.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z M8 7.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z" +
            "M13 7.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z M16 11.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z",
    },
    // A pencil laid on its writing line — the rename/edit gesture.
    edit: {
        d: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" +
            "M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    },
    // Two crossing arrows — the re-roll gesture.
    shuffle: {
        d: "M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46" +
            " 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z",
    },
    // Full arrows with a shaft — a step up or down a hierarchy (drill up / expand a level), as against
    // the chevrons, which open and close one thing.
    "arrow-up": {
        d: "M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z",
    },
    "arrow-down": {
        d: "M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z",
    },
    // How many views a comparison shows: two dots side by side, or one — the compare-mode toggle
    // (two views, or one area wiped at a seam). Drawn, so the dots stay round and even at any DPI.
    "views-two": {
        d: "M4 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0z M14 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0z",
    },
    "views-one": {
        d: "M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0z",
    },
    // Three bars — the "configure / more" trigger, centred in its square like every other drawn icon.
    menu: {
        d: "M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z",
    },
};
function svgIcon(spec) {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "ds-iconbtn__svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", spec.d);
    if (spec.evenodd)
        path.setAttribute("fill-rule", "evenodd");
    svg.appendChild(path);
    return svg;
}
const CHEV_CLASS = { "chevron-up": "ds-iconbtn--chev-up", "chevron-down": "ds-iconbtn--chev-down",
    "chevron-left": "ds-iconbtn--chev-left", "chevron-right": "ds-iconbtn--chev-right" };
/** Put `icon` on the button — a drawn chevron (a class), a folder (a span), an SVG path, a named
 *  glyph, or literal text — replacing whatever it showed before. */
function applyIcon(root, icon) {
    root.classList.remove(...Object.values(CHEV_CLASS));
    root.classList.toggle("ds-iconbtn--filled", !!icon && isGlyphName(icon) && FILLED_GLYPHS.has(icon));
    root.replaceChildren();
    const chev = icon ? CHEV_CLASS[icon] : undefined;
    const svg = icon ? SVG_PATHS[icon] : undefined;
    if (chev)
        root.classList.add(chev);
    else if (icon === "folder")
        root.appendChild(el("span", "ds-pathchip__icon"));
    else if (svg)
        root.appendChild(svgIcon(svg));
    else
        root.textContent = glyphText(icon);
}
export function createIconButton(host, opts = {}) {
    const root = el("button", "ds-iconbtn"
        + (opts.variant === "danger" ? " ds-iconbtn--danger" : "")
        + (opts.size === "sm" ? " ds-iconbtn--sm" : opts.size === "xs" ? " ds-iconbtn--xs" : ""));
    root.type = "button";
    applyIcon(root, opts.icon);
    if (opts.active)
        root.classList.add("ds-active");
    // An icon button carries no text, so it has no accessible name of its own. Its hint is the name
    // unless the caller gives another — the two said the same thing at nearly every call site.
    const setTip = (tip, ariaLabel) => {
        if (tip)
            root.setAttribute(DS_TIP_ATTR, tip);
        else
            root.removeAttribute(DS_TIP_ATTR);
        const name = ariaLabel ?? tip;
        if (name)
            root.setAttribute("aria-label", name);
        else
            root.removeAttribute("aria-label");
    };
    setTip(opts.tip, opts.ariaLabel);
    if (opts.disabled)
        root.classList.add("ds-disabled");
    if (opts.onClick)
        root.addEventListener("click", opts.onClick);
    host.appendChild(root);
    return handle(root, {
        setDisabled: (d) => root.classList.toggle("ds-disabled", !!d),
        setActive: (a) => root.classList.toggle("ds-active", !!a),
        setIcon: (icon) => applyIcon(root, icon),
        setTip: (tip, ariaLabel) => setTip(tip, ariaLabel),
    });
}
function glyphText(icon) {
    if (icon === undefined || icon === "browse")
        return "…";
    return isGlyphName(icon) ? ICON_GLYPHS[icon] : icon;
}
