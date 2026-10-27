import { type DsHandle } from "../dom.js";
import { type SearchOptions, type SearchHandle } from "../atoms/ds-search.js";
import { type SegmentedOptions, type SegmentedHandle } from "../atoms/ds-segmented.js";
import { type ButtonOptions, type ButtonHandle } from "../atoms/ds-button.js";
export interface ToolbarOptions {
    search?: SearchOptions;
    segmented?: SegmentedOptions;
    actions?: ButtonOptions[];
}
export interface ToolbarHandle extends DsHandle<HTMLDivElement> {
    search: SearchHandle | null;
    segmented: SegmentedHandle | null;
    actions: ButtonHandle[];
}
export declare function createToolbar(host: HTMLElement, opts?: ToolbarOptions): ToolbarHandle;
