import { type DsHandle } from "../dom.js";
export type CheckboxState = "on" | "off" | "partial";
export interface CheckboxOptions {
    state?: CheckboxState;
    label?: string;
    disabled?: boolean;
    onChange?: (state: CheckboxState) => void;
}
export interface CheckboxHandle extends DsHandle<HTMLButtonElement> {
    getState(): CheckboxState;
    setState(s: CheckboxState): void;
    setDisabled(d: boolean): void;
}
export declare function createCheckbox(host: HTMLElement, opts?: CheckboxOptions): CheckboxHandle;
