import { type DsHandle } from "../dom.js";
/** RGBA as the renderer speaks it: four 0..1 floats. Alpha is optional on input (defaults to 1). */
export type Rgba = [number, number, number, number];
/** How the entry reads a colour: one hex box, or one box per channel in 0-255 or 0.0-1.0. */
export type ColorNotation = "hex" | "int" | "float";
export interface ColorPickOptions {
    /** Current colour. 0..1 floats — the form a scene/render setting already has. */
    value?: Rgba | [number, number, number];
    /**
     * Show the numeric ENTRY under the gradient: the mode toggle plus either the hex box or one box
     * per channel. OFF by default — the plane and the strips are how a colour is picked; the entry is
     * for a value that has to be exact (a colour copied from somewhere else).
     */
    channels?: boolean;
    /** Include the alpha channel: the alpha strip, the readout, and the fourth entry box. */
    alpha?: boolean;
    /** Which notation the entry opens in (default "hex"). */
    notation?: ColorNotation;
    /** Live while the plane or a strip is dragged — no commit. */
    onInput?: (value: Rgba) => void;
    /** Committed: a drag release, an arrow key, or an entry box's Enter / blur. */
    onChange?: (value: Rgba) => void;
}
export interface ColorPickHandle extends DsHandle<HTMLButtonElement> {
    getValue(): Rgba;
    setValue(v: Rgba | [number, number, number]): void;
    close(): void;
}
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
export declare function parseColorText(text: string): Rgba | null;
/**
 * Parse ONE channel box: a whole 0-255 number in `"int"`, a 0.0-1.0 number in `"float"`. Returns the
 * channel as a 0..1 float, or null when the text is not a number of that notation.
 */
export declare function parseChannelText(text: string, notation: ColorNotation): number | null;
/** Write `v` in one notation — the text the hex box shows. `alpha` off drops the 4th channel. */
export declare function formatColorText(v: Rgba, notation: ColorNotation, alpha?: boolean): string;
/** Write ONE channel the way its box shows it: a 0-255 byte, or a 0.0-1.0 number to three places. */
export declare function formatChannelText(n: number, notation: ColorNotation): string;
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
export declare function createColorPicker(host: HTMLElement, opts?: ColorPickOptions): ColorPickHandle;
