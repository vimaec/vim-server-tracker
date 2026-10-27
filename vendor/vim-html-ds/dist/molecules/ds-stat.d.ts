import { type DsHandle, type Tone } from "../dom.js";
export interface StatOptions {
    label?: string;
    value?: string;
    unit?: string;
    delta?: string;
    tone?: Tone;
}
export interface StatHandle extends DsHandle<HTMLDivElement> {
    setValue(v: string): void;
    setDelta(text: string, tone?: Tone): void;
    /** Restore the value + delta the card was created with (its empty/initial state). */
    reset(): void;
}
export declare function createStat(host: HTMLElement, opts?: StatOptions): StatHandle;
