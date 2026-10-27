import { type DsHandle } from "../dom.js";
export type BarTone = "cyan" | "good" | "warn" | "bad" | "teal";
export interface BarOptions {
    max?: number;
    value?: number;
    tone?: BarTone;
}
export interface BarHandle extends DsHandle<HTMLDivElement> {
    setValue(v: number): void;
}
export declare function createBar(host: HTMLElement, opts?: BarOptions): BarHandle;
