import { type DsHandle } from "../dom.js";
export interface SlicerOptions {
    title?: string;
    field?: string;
    values?: string[];
    counts?: Record<string, number>;
    selected?: string[];
    onChange?: (selected: string[]) => void;
}
export interface SlicerHandle extends DsHandle<HTMLDivElement> {
    getSelected(): string[];
    setSelected(next: string[]): void;
}
export declare function createSlicer(host: HTMLElement, opts?: SlicerOptions): SlicerHandle;
