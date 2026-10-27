import { type DsHandle } from "../dom.js";
export interface CollapseOptions {
    accent?: boolean;
    open?: boolean;
    title?: string;
    /** An icon-font glyph between the caret and the title (a gear on a settings section, say),
     *  muted so it labels the section without competing with its name. */
    icon?: string;
    onToggle?: (open: boolean) => void;
    /** A grab bar on the section's TOP edge drags its height — the body scrolls inside the size the
     *  user gave it, and the content above the section takes or yields the difference. Inverted drag
     *  (up grows), because these sections dock at the bottom of a column. Double-click resets to
     *  content-sized. The bar hides while the section is collapsed. Named as on ds-table, where the
     *  height family (heightResizable/minHeight/maxHeightOf/onHeightResize/setHeight) spells the
     *  same and bare `resizable` means the columns. */
    heightResizable?: boolean;
    /** Height floor for the drag, px (default 80 — the header and a row of controls). */
    minHeight?: number;
    /** Ceiling for the drag, measured at drag start — the layout's business: "the pane minus what the
     *  content above must keep". Without it the bar can drag the section over everything above it. */
    maxHeightOf?: () => number;
    /** The user dragged the bar: the new height in px, or null when a reset returned the section to
     *  content-sized. Persist this to restore the height on reload via setHeight. */
    onHeightResize?: (height: number | null) => void;
}
export interface CollapseHandle extends DsHandle<HTMLDivElement> {
    body: HTMLDivElement;
    isOpen(): boolean;
    toggle(open?: boolean): void;
    /** Give the section a real height in px (restoring a persisted onHeightResize value), or null to return
     *  to content-sized — the resize bar's own semantics. */
    setHeight(px: number | null): void;
}
export declare function createCollapse(host: HTMLElement, opts?: CollapseOptions): CollapseHandle;
