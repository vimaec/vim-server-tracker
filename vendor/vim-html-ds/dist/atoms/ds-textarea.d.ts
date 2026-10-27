import { type DsHandle } from "../dom.js";
export declare const DEFAULT_TEXTAREA_MAX = 20000;
export interface TextareaOptions {
    placeholder?: string;
    rows?: number;
    value?: string;
    /** Maximum characters (also caps a paste); default DEFAULT_TEXTAREA_MAX. */
    maxLength?: number;
    disabled?: boolean;
    onInput?: (value: string) => void;
    onChange?: (value: string) => void;
}
export interface TextareaHandle extends DsHandle<HTMLTextAreaElement> {
    getValue(): string;
    setValue(v: string): void;
    setDisabled(d: boolean): void;
}
export declare function createTextarea(host: HTMLElement, opts?: TextareaOptions): TextareaHandle;
