import { type DsHandle } from "../dom.js";
export interface SettingOptions {
    label?: string;
    help?: string;
    modified?: boolean;
    control?: (cell: HTMLDivElement) => void;
    /** Reset-to-default. Supplying it is what puts the reset button in the row; without it the row has
     *  no reset affordance at all. */
    onReset?: () => void;
}
export interface SettingHandle extends DsHandle<HTMLDivElement> {
    control: HTMLDivElement;
    setModified(m: boolean): void;
}
export declare function createSetting(host: HTMLElement, opts?: SettingOptions): SettingHandle;
