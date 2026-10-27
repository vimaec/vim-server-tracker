import { type DsHandle } from "../dom.js";
export interface ButtonOptions {
    label?: string;
    variant?: string;
    disabled?: boolean;
    onClick?: (ev: MouseEvent) => void;
}
export interface ButtonHandle extends DsHandle<HTMLButtonElement> {
    setLabel(l: string): void;
    setDisabled(d: boolean): void;
    setActive(a: boolean): void;
}
export declare function createButton(host: HTMLElement, opts?: ButtonOptions): ButtonHandle;
