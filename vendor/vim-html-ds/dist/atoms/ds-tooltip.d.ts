import { type DsHandle } from "../dom.js";
export declare const DS_TIP_ATTR = "data-ds-tip";
export declare const DS_TIP_DELAY_ATTR = "data-ds-tip-delay";
export interface TooltipOptions {
    delay?: number;
    /** Positioning. "cursor" (default) trails the pointer; "element" docks the tip above the hovered
     *  target and flips below it when clipped at the top — the control-bar/capsule style. A target
     *  wider than the tip (a row's text, a table cell) docks it over the POINTER's x instead of the
     *  target's centre, so the hint appears where the hand is, never at the far end of a long row. */
    anchor?: "cursor" | "element";
}
export interface FlashOptions {
    /** How long the confirmation stands, in ms (default 1400). */
    ms?: number;
    /** The viewport point the confirmation answers — the click that earned it. Given, the tip sits
     *  just under and to the right of it; absent, it centres above `target`. */
    at?: {
        x: number;
        y: number;
    };
}
export interface TooltipHandle extends DsHandle<HTMLDivElement> {
    bindAll(root: HTMLElement): void;
    hide(): void;
    /** Show `text` as a confirmation — "✓ Copied" — that the hover hides (mouseout, mousedown) and
     *  hover texts do not cut short; `hide()` still does. Placement and duration: `FlashOptions`. */
    flash(target: Element, text: string, opts?: FlashOptions): void;
}
export declare function createTooltip(opts?: TooltipOptions): TooltipHandle;
