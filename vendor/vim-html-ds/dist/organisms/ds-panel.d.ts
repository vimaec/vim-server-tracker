import { type DsHandle } from "../dom.js";
export interface PanelOptions {
    title?: string;
    /** A muted secondary line beside the title — a LIVE status/summary caption ("42,000 elements",
     *  "loading…", "no model"), NOT necessarily a number. Static one-liners describing the panel
     *  belong in `tip`, not here. */
    subtitle?: string;
    /** A hover hint on the title (data-ds-tip) — the home for the one-line tagline the subtitle
     *  deliberately doesn't carry. */
    tip?: string;
    side?: "left" | "right";
    width?: number | string;
    /** The panel IS a layout cell (a resizable pane owns the width) — drop the dock clamps and fill. */
    fill?: boolean;
    /** Adopt an existing element's CHILDREN into the panel body, then remove the (now-empty)
     *  wrapper — the author writes panel content as normal HTML (typically `hidden`, so it can't
     *  flash before adoption) and the panel forms around it. NOTE: children move, the wrapper dies
     *  (a stray wrapper between the body and the content would break the body's flex layout) —
     *  deliberately different from a layout pane's adopt, which moves the element itself. */
    adopt?: string | HTMLElement;
    onClose?: () => void;
}
export interface PanelHandle extends DsHandle<HTMLElement> {
    body: HTMLDivElement;
    /** The head's ACTIONS slot, right-aligned before the close: the panel-level controls (a preset
     *  picker, a save, an export) that act on the whole panel. Lazy — reading it reveals it and the
     *  head. Row-level and section-level actions belong in the body, not here. */
    readonly actions: HTMLDivElement;
    /** The head's CRUMB slot, right after the title behind a "›": the subject the panel is ON (the
     *  file a workflow shows, the record an inspector edits), so the head reads "Title › subject", the
     *  two on one text baseline. When the head runs out of room the title stays whole and the subject
     *  shares the shrink with the actions. Lazy, like `actions`. */
    readonly crumb: HTMLDivElement;
    readonly foot: HTMLDivElement;
    setSubtitle(t?: string | null): void;
    setTitle(t: string): void;
}
export declare function createPanel(host: HTMLElement, opts?: PanelOptions): PanelHandle;
