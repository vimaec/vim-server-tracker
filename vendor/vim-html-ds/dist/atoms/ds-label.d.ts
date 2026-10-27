import { type DsHandle } from "../dom.js";
export interface LabelOptions {
    text?: string;
    variant?: "eyebrow" | "title" | "body" | "dim" | "value";
    /** One line, as wide as its box allows, ellipsized past that (the full text belongs in a hint). */
    truncate?: boolean;
}
export interface LabelHandle extends DsHandle<HTMLSpanElement> {
    setText(t: string): void;
}
export declare function createLabel(host: HTMLElement, opts?: LabelOptions): LabelHandle;
