import { type DsHandle } from "../dom.js";
export interface SegmentedOption {
    id: string;
    label: string;
}
export interface SegmentedOptions {
    options?: (SegmentedOption | string)[];
    value?: string;
    onChange?: (value: string) => void;
}
export interface SegmentedHandle extends DsHandle<HTMLDivElement> {
    getValue(): string | null;
    setValue(v: string): void;
    setDisabled(d: boolean): void;
}
export declare function createSegmented(host: HTMLElement, opts?: SegmentedOptions): SegmentedHandle;
