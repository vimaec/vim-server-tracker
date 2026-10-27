import { type DsHandle } from "../dom.js";
export type GaugeTone = "cyan" | "good" | "warn" | "bad";
export interface GaugeOptions {
    max?: number;
    value?: number;
    tone?: GaugeTone;
    label?: string;
    format?: (v: number) => string;
}
export interface GaugeHandle extends DsHandle<HTMLDivElement> {
    setValue(v: number): void;
    setLabel(t: string): void;
}
export declare function createGauge(host: HTMLElement, opts?: GaugeOptions): GaugeHandle;
