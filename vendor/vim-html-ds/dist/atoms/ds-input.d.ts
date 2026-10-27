import { type DsHandle } from "../dom.js";
export declare const DEFAULT_INPUT_MAX = 1000;
export interface InputOptions {
    variant?: "mono" | "inline";
    type?: string;
    placeholder?: string;
    value?: string;
    /** Maximum characters (also caps a paste); default DEFAULT_INPUT_MAX. */
    maxLength?: number;
    readonly?: boolean;
    disabled?: boolean;
    onInput?: (value: string) => void;
    onChange?: (value: string) => void;
}
export interface InputHandle extends DsHandle<HTMLInputElement> {
    getValue(): string;
    setValue(v: string): void;
    focus(): void;
    setDisabled(d: boolean): void;
}
export declare function createInput(host: HTMLElement, opts?: InputOptions): InputHandle;
