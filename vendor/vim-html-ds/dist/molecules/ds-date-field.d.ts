import { type DsHandle } from "../dom.js";
export interface DateFieldOptions {
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    yearMin?: number;
    yearMax?: number;
    onChange?: (iso: string) => void;
}
export interface DateFieldHandle extends DsHandle<HTMLDivElement> {
    getValue(): string;
    setValue(iso: string): void;
    setDisabled(d: boolean): void;
}
export declare function createDateField(host: HTMLElement, opts?: DateFieldOptions): DateFieldHandle;
