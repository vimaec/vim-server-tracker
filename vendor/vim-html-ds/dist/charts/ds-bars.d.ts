import { type DsHandle } from "../dom.js";
export interface BarsOptions {
    labels?: string[];
    values?: number[];
    format?: (v: number) => string;
    direction?: "vertical" | "horizontal";
    palette?: "single" | "categorical";
    colors?: string[];
    showValues?: boolean;
}
export interface BarsHandle extends DsHandle<HTMLDivElement> {
    setData(labels: string[], values: number[]): void;
}
export declare function createBars(host: HTMLElement, opts?: BarsOptions): BarsHandle;
