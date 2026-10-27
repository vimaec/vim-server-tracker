import { type DsHandle, type EditState } from "../dom.js";
export interface EditCellOptions {
    value?: string | number;
    format?: "int" | "float";
    state?: EditState;
    onEdit?: (value: string | number) => void;
}
export interface EditCellHandle extends DsHandle<HTMLSpanElement> {
    getValue(): string | number;
    setValue(v: string | number): void;
    getState(): EditState;
    setState(s: EditState): void;
}
export declare function createEditCell(host: HTMLElement, opts?: EditCellOptions): EditCellHandle;
