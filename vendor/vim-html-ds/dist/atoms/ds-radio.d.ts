import { type DsHandle } from "../dom.js";
export interface RadioOption {
    id: string;
    label: string;
    disabled?: boolean;
}
export interface RadioOptions {
    options?: (RadioOption | string)[];
    value?: string | null;
    direction?: "row" | "column";
    onChange?: (value: string) => void;
}
export interface RadioHandle extends DsHandle<HTMLDivElement> {
    getValue(): string | null;
    setValue(v: string | null): void;
}
export declare function createRadio(host: HTMLElement, opts?: RadioOptions): RadioHandle;
