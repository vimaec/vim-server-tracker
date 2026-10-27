import { type DsHandle } from "../dom.js";
import { type ChipOptions } from "../atoms/ds-chip.js";
import { createMenu } from "../molecules/ds-menu.js";
export interface ThumbCardOptions {
    name?: string;
    thumb?: string;
    status?: "linked" | "packaged";
    /** Extra chip on the title row, after the status chip (e.g. a CURRENT marker). */
    chip?: ChipOptions;
    meta?: string;
    time?: string;
    path?: string;
    actions?: NonNullable<Parameters<typeof createMenu>[0]>["items"];
    onOpen?: () => void;
    onExplore?: (path: string) => void;
}
export type ThumbCardHandle = DsHandle<HTMLDivElement> & {
    /** Fill in the preview after the card is on screen. A thumbnail that costs IO is what makes a
     *  card list slow to appear, so a caller can build the whole list with no previews and hand
     *  each one over as it arrives. No argument restores the "no preview" slot. */
    setThumb: (url?: string) => void;
};
export declare function createThumbCard(host: HTMLElement, opts?: ThumbCardOptions): ThumbCardHandle;
