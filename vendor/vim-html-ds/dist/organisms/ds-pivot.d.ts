import { type DsHandle } from "../dom.js";
export interface PivotRow {
    label: string;
    values?: Record<string, number[]>;
    children?: PivotRow[];
    open?: boolean;
}
export interface PivotOptions {
    colGroups?: string[];
    measures?: string[];
    rows?: PivotRow[];
    rowLabel?: string;
    maxHeight?: number | string;
    totals?: boolean;
    onToggle?: (row: PivotRow) => void;
}
export interface PivotHandle extends DsHandle<HTMLDivElement> {
    setRows(next: PivotRow[]): void;
}
export declare function createPivot(host: HTMLElement, opts?: PivotOptions): PivotHandle;
