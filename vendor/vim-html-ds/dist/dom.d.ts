export declare function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string | null): HTMLElementTagNameMap[K];
export interface DsHandle<E extends HTMLElement = HTMLElement> {
    el: E;
    destroy(): void;
    /** Show or hide the component. The sanctioned form of `handle.el.style.display = "none"` — the
     *  reach-in every page was writing; `.el` stays the escape hatch, not the first resort. */
    setVisible(visible: boolean): void;
}
export type EditState = "clean" | "pending" | "invalid";
export type Tone = "cyan" | "teal" | "good" | "warn" | "bad" | "violet" | "orange";
export interface ChildScope {
    track<T extends {
        destroy(): void;
    }>(child: T): T;
    disposeAll(): void;
}
export declare function childScope(): ChildScope;
export declare function rovingFocus(container: HTMLElement, itemSelector: string): void;
/** A field's length cap from its option: a finite value of at least 1 (floored), Infinity for no
 *  cap at all, and the default for anything else (undefined, NaN, zero, negative). */
export declare function lengthCap(requested: number | undefined, fallback: number): number;
/** Apply a cap to a text control: the HTML maxlength (bounds a paste), or none for Infinity. */
export declare function applyLengthCap(field: HTMLInputElement | HTMLTextAreaElement, cap: number): (v: string) => string;
export declare function handle<E extends HTMLElement, X extends object>(root: E, extra: X): DsHandle<E> & X;
/** Register a popup's close with the OSR dismiss broadcast; returns the unregister. */
export declare function registerDismissable(close: () => void): () => void;
export declare function onClickOutside(within: HTMLElement[], cb: () => void): () => void;
export declare function dropIndex(mids: number[], y: number): number;
export declare function reorderable(container: HTMLElement, opts: {
    itemSelector: string;
    handleSelector?: string;
    onReorder: (from: number, to: number) => void;
}): () => void;
export declare function dragWidth(start: number, dx: number, min: number, max?: number): number;
export interface ColumnGripOptions {
    /** Which edge of `host` carries the rule. Default "right". */
    anchor?: "left" | "right";
    /** Width floor in px (default 48). */
    min?: number;
    /** Width ceiling in px (default: none). */
    max?: number;
    /** Dynamic ceiling, measured at drag start (and per keypress) — for a size bounded by layout that
     *  is not known at creation, e.g. "the pane minus what its neighbours must keep". Beats `max`. */
    maxOf?: () => number;
    /** Accessible name — what this rule resizes, e.g. the column's label. */
    label?: string;
    /** px per arrow key (default 8); Shift takes 4× bites. */
    step?: number;
    /** Negate the drag: for a grip on the TOP edge of a bottom-docked section, moving the pointer UP
     *  grows the size. Arrow keys follow the boundary the same way (up = grow). */
    invert?: boolean;
    /** Width at grab time. MEASURE it when the column has no stored width, or the first stretch of
     *  the drag is dead while the pointer catches up to a stale number. */
    startWidth(): number;
    /** The new absolute width — at most once per animation frame during a drag, then once on drop. */
    onResize(width: number): void;
    /** Double-click on the rule (reset to the column's default width). */
    onReset?(): void;
}
export declare function columnGrip(host: HTMLElement, opts: ColumnGripOptions): () => void;
export declare function rowGrip(host: HTMLElement, opts: ColumnGripOptions): () => void;
export declare function clampFixed(node: HTMLElement, x: number, y: number, pad?: number): void;
