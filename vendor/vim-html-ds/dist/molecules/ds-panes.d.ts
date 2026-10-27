import { type DsHandle } from "../dom.js";
export interface PaneSpec {
    /** Names the pane for {@link PanesHandle.pane} and the callbacks. */
    id: string;
    title: string;
    /** A semantic tone for the title (a token name: "bad", "good", "warn", …). */
    tone?: string;
    /** Start parked. */
    parked?: boolean;
    /** The head's hint while the pane is open (a parked strip's hint is "Show the <title> pane"). */
    tip?: string;
}
export interface PanesOptions {
    panes: PaneSpec[];
    /** Width floor for a drag, px (default 160). */
    minWidth?: number;
    /** The head is a gesture: a click on it (outside its caret, lead and tools) calls this. The head
     *  takes the pointer and a hover tint while enabled (see {@link PaneHandle.setHeadEnabled}). */
    onHeadClick?: (id: string) => void;
    /** A pane was parked or brought back — by the caret, the strip, or {@link PaneHandle.setParked}. */
    onParkChange?: (id: string, parked: boolean) => void;
}
export interface PaneHandle {
    readonly id: string;
    readonly el: HTMLDivElement;
    readonly head: HTMLDivElement;
    /** Before the title, and kept in the parked strip: a press on it is its own, never a restore. */
    readonly lead: HTMLSpanElement;
    /** After the title (a count, say); hidden while parked. */
    readonly meta: HTMLSpanElement;
    /** Right-anchored on the head (a pane's own tools); hidden while parked. */
    readonly tools: HTMLSpanElement;
    /** The pane's content. Hidden while parked, whatever display it carries itself. */
    readonly body: HTMLDivElement;
    isParked(): boolean;
    setParked(on: boolean): void;
    /** The head wears the selection look (the ds-sel contract) — its gesture's result stands. */
    setHeadActive(on: boolean): void;
    /** Off, the head is a plain title: no pointer, no hover, no gesture. */
    setHeadEnabled(on: boolean): void;
    setHeadTip(tip: string): void;
}
export interface PanesHandle extends DsHandle<HTMLDivElement> {
    readonly panes: PaneHandle[];
    pane(id: string): PaneHandle | undefined;
    /** Every open pane back to an equal share. */
    evenOut(): void;
}
export declare function createPanes(host: HTMLElement, opts: PanesOptions): PanesHandle;
