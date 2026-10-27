import { type DsHandle, type Tone } from "../dom.js";
export interface ChipOptions {
    text?: string;
    tone?: Tone;
    /** Makes the chip actionable (cursor + click) — the mechanism behind a clickable status/basis
     *  pill that opens a menu or provenance. The chip's meaning/vocabulary stays with the consumer. */
    onClick?: (ev: MouseEvent) => void;
}
export interface ChipHandle extends DsHandle<HTMLSpanElement> {
    setText(t: string): void;
    setTone(tone?: Tone | null): void;
}
export declare function createChip(host: HTMLElement, opts?: ChipOptions): ChipHandle;
