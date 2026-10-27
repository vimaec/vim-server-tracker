import { type DsHandle } from "../dom.js";
import { type ButtonOptions } from "../atoms/ds-button.js";
export interface EmptyOptions {
    title?: string;
    hint?: string;
    action?: ButtonOptions;
    /** Take the host's whole room (a flex item that grows) and centre the state in it, on the panel
     *  surface — for a region that has nothing to show yet. The handle's `el` is then that filling
     *  wrapper. */
    fill?: boolean;
}
export interface EmptyHandle extends DsHandle<HTMLDivElement> {
}
export declare function createEmpty(host: HTMLElement, opts?: EmptyOptions): EmptyHandle;
