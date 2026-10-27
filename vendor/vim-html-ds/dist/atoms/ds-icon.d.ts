import { type DsHandle } from "../dom.js";
export interface IconOptions {
    glyph?: string;
    size?: "sm" | "md" | "lg";
    tone?: string;
    /** The glyph is a codepoint of the Filled font. */
    filled?: boolean;
}
export interface IconHandle extends DsHandle<HTMLSpanElement> {
    setGlyph(g: string): void;
}
export declare function createIcon(host: HTMLElement, opts?: IconOptions): IconHandle;
