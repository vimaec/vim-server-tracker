import { type DsHandle } from "../dom.js";
import { type IconButtonHandle } from "../atoms/ds-icon-button.js";
export interface PathFieldOptions {
    value?: string;
    placeholder?: string;
    defaultValue?: string;
    onBrowse?: () => void;
    onExplore?: (value: string) => void;
    onReset?: (value: string) => void;
}
export interface PathFieldHandle extends DsHandle<HTMLDivElement> {
    getValue(): string;
    setValue(v?: string | null): void;
    browse: IconButtonHandle;
    explore: IconButtonHandle;
    reset: IconButtonHandle;
}
export declare function createPathField(host: HTMLElement, opts?: PathFieldOptions): PathFieldHandle;
