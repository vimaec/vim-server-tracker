import { type DsHandle } from "../dom.js";
/** Named icon-font characters (FluentUI System Icons codepoints, drawn by `--font-icon`, or by
 *  `--font-icon-filled` for a name in FILLED_GLYPHS). Consumers name the icon; the codepoint lives
 *  here once. Also usable as `createIcon({ glyph: ICON_GLYPHS.add })`. */
export declare const ICON_GLYPHS: {
    readonly add: "";
    readonly more: "";
    readonly back: "";
    readonly copy: "";
    readonly download: "";
    readonly filter: "";
    readonly eye: "󰫱";
    readonly "eye-off": "";
    readonly clear: "";
    readonly play: "";
    readonly pause: "";
    readonly eraser: "";
    readonly eyedropper: "";
    readonly lock: "";
    readonly unlock: "";
    readonly "chevron-down-glyph": "";
};
export type IconGlyphName = keyof typeof ICON_GLYPHS;
/** The names whose glyph is in the Filled font. The two Fluent fonts reuse the same codepoints, so
 *  the character alone does not say which drawing it is; the font family does. */
export declare const FILLED_GLYPHS: ReadonlySet<IconGlyphName>;
export interface IconButtonOptions {
    icon?: string;
    variant?: "danger";
    /** Dense-row squares: "sm" = 22px, "xs" = 20px (the default is the control height). */
    size?: "sm" | "xs";
    /** Start toggled-on (the ds-active look); flip later via the handle. */
    active?: boolean;
    tip?: string;
    /** The button's accessible NAME, when it should differ from the hint — a hint may explain what the
     *  press does at length ("Edit the filter — value sets, parameters, AND/OR groups") where the name
     *  is the thing itself ("Toggle the filter editor"). Left out, the hint is the name. */
    ariaLabel?: string;
    disabled?: boolean;
    onClick?: (ev: MouseEvent) => void;
}
export interface IconButtonHandle extends DsHandle<HTMLButtonElement> {
    setDisabled(d: boolean): void;
    setActive(a: boolean): void;
    /** Swap the icon: any form the `icon` option takes (a named glyph, a drawn chevron or SVG icon,
     *  literal text) — a state icon such as eye ↔ eye-off. */
    setIcon(icon: IconGlyphName | string): void;
    /** Change the hint and, with it, the accessible name — `ariaLabel` when the name should differ
     *  (as the option does). A state button (locked ↔ free) says the new state in one call. */
    setTip(tip: string, ariaLabel?: string): void;
}
export declare function createIconButton(host: HTMLElement, opts?: IconButtonOptions): IconButtonHandle;
