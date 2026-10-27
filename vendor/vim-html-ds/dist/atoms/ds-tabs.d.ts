import { type DsHandle } from "../dom.js";
export interface TabOption {
    id: string;
    label: string;
    chip?: string | number;
    /** Render a close affordance on this tab; overrides the strip-wide {@link TabsOptions.closable}. */
    closable?: boolean;
}
export interface TabsOptions {
    options?: (TabOption | string)[];
    value?: string;
    variant?: "filled";
    onChange?: (value: string) => void;
    /** Create one ds-tabpanel per option in this host; the active panel carries ds-open. */
    panels?: HTMLElement;
    /** Give every tab a close affordance (a per-option `closable` overrides this). */
    closable?: boolean;
    /** A tab's × was pressed, or the tab was middle-clicked. The strip does NOT remove the tab — call
     *  removeTab(id) once the host has decided (asking about unsaved work first, refusing to close
     *  the last one, …). */
    onClose?: (id: string) => void;
}
export interface TabsHandle extends DsHandle<HTMLDivElement> {
    getValue(): string | null;
    /** Reflect a value chosen elsewhere: applies WITHOUT firing onChange. To navigate, use select. */
    setValue(v: string): void;
    /** The programmatic click: applies AND fires onChange (if the value actually changed). */
    select(v: string): void;
    setChip(id: string, text: string | number): void;
    /** Disable/enable one tab. A disabled tab refuses clicks AND select() — a mode you cannot enter
     *  yet (its content does not exist) must not be enterable by any path. `tip` says WHY (shown as
     *  the tab's tooltip): a disabled affordance that explains itself beats one that just sits there
     *  grey. Disabling never moves the current value — the consumer decides where to bounce. */
    setDisabled(id: string, disabled: boolean, tip?: string): void;
    /** Append a tab (with its panel, when the strip owns panels). A duplicate id is a no-op, and the
     *  current value never moves — select() it if the new tab should also be entered. */
    addTab(tab: TabOption | string): void;
    /** Remove a tab and its panel. Removing the ACTIVE tab moves the value to its neighbour (the tab
     *  that takes its place, else the one before it) and fires onChange — the strip is never left
     *  pointing at a tab that no longer exists. Emptying it leaves the value null. */
    removeTab(id: string): void;
    /** The tab ids, in strip order. */
    ids(): string[];
    /** Re-measure the overflow NOW, synchronously. The strip already does this after every change of
     *  its own and on resize; call it when something outside the DS moved a tab's width (a web font
     *  landing, a host animation settling), or from a DOM that never lays out and never fires a
     *  ResizeObserver (tests). */
    reflow(): void;
    /** The option's panel (with `panels`); undefined otherwise or for an unknown id. */
    panel(id: string): HTMLDivElement | undefined;
}
export declare function createTabs(host: HTMLElement, opts?: TabsOptions): TabsHandle;
