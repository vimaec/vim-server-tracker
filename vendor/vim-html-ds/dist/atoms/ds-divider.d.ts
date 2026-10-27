import { type DsHandle } from "../dom.js";
export interface DividerOptions {
    label?: string;
    vertical?: boolean;
}
export interface DividerHandle extends DsHandle<HTMLDivElement> {
}
export declare function createDivider(host: HTMLElement, opts?: DividerOptions): DividerHandle;
