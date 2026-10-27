import { type DsHandle } from "../dom.js";
export interface FieldOptions {
    label?: string;
    required?: boolean;
    help?: string;
}
export interface FieldHandle extends DsHandle<HTMLDivElement> {
    body: HTMLDivElement;
    setError(msg?: string | null): void;
}
export declare function createField(host: HTMLElement, opts?: FieldOptions): FieldHandle;
