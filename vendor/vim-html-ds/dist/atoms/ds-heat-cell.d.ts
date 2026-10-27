import { type DsHandle } from "../dom.js";
export type HeatCellTone = "green" | "amber" | "red";
export interface HeatCellOptions {
    text?: string;
    tone?: HeatCellTone;
    intensity?: number;
}
export interface HeatCellHandle extends DsHandle<HTMLSpanElement> {
    setText(t: string): void;
    set(tone: HeatCellTone, intensity?: number): void;
}
export declare function createHeatCell(host: HTMLElement, opts?: HeatCellOptions): HeatCellHandle;
