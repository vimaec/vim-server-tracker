import { type DsHandle } from "../dom.js";
export interface LegendRow {
    label: string;
    color: string;
    count?: number;
    band?: "paint" | "context";
}
export interface LegendOptions {
    rows?: LegendRow[];
    onActivate?: (row: LegendRow, index: number) => void;
}
export interface LegendHandle extends DsHandle<HTMLDivElement> {
    setRows(rows: LegendRow[]): void;
}
export declare function createLegend(host: HTMLElement, opts?: LegendOptions): LegendHandle;
