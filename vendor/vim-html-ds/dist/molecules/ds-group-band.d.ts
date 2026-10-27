import { type DsHandle } from "../dom.js";
export interface GroupBandOptions {
    label?: string;
    count?: number;
    subtotals?: string;
    onToggle?: () => void;
}
export interface GroupBandHandle extends DsHandle<HTMLDivElement> {
    setSubtotals(s: string): void;
}
export declare function createGroupBand(host: HTMLElement, opts?: GroupBandOptions): GroupBandHandle;
