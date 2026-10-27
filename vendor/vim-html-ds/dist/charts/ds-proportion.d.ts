import { type DsHandle } from "../dom.js";
export interface ProportionPart {
    name: string;
    value: number;
    color?: string;
}
export interface ProportionOptions {
    parts?: ProportionPart[];
    variant?: "bar" | "pie";
}
export interface ProportionHandle extends DsHandle<HTMLDivElement> {
    setParts(parts: ProportionPart[]): void;
}
export declare function createProportion(host: HTMLElement, opts?: ProportionOptions): ProportionHandle;
export interface ProportionRow {
    label: string;
    parts: ProportionPart[];
}
export interface ProportionGroupOptions {
    rows?: ProportionRow[];
    scale?: "shared" | "fill";
}
export interface ProportionGroupHandle extends DsHandle<HTMLDivElement> {
    setRows(rows: ProportionRow[]): void;
}
export declare function createProportionGroup(host: HTMLElement, opts?: ProportionGroupOptions): ProportionGroupHandle;
