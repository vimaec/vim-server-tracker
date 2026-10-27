import { type DsHandle, type EditState } from "../dom.js";
export interface SelectOption {
    id: string;
    label: string;
    /** A colour swatch before the label, in the trigger AND the menu (see MenuItem.dot). */
    dot?: string;
    /** A glyph before the label, in the trigger AND the menu — the shape language for enums that are
     *  STATES rather than scales (a lifecycle wants shapes; a scale wants the colour dot). */
    icon?: string;
    /** Colour for `icon`; default the dim text tone (see MenuItem.iconColor). */
    iconColor?: string;
    /** Dim trailing context after the label, in the trigger AND the menu (see MenuItem.hint) —
     *  a count, a position: the label is the content, the hint the context. */
    hint?: string;
    /** An ACTION option: picking it runs this and leaves the value alone ("Manage Team…" opening a
     *  roster editor). The menu closes; nothing commits, so an enum cell never stores a verb. */
    action?: () => void;
    /** Draw a separator line after this option — for grouping actions away from values. */
    separatorAfter?: boolean;
}
export interface SelectOptions {
    options?: (SelectOption | string)[];
    value?: string | null;
    placeholder?: string;
    state?: EditState;
    /** Fill the container's width instead of sizing to the current label — what a select stacked in a
     *  ds-field above a ds-input needs, so the two controls line up on both edges. */
    block?: boolean;
    onChange?: (value: string) => void;
}
export interface SelectHandle extends DsHandle<HTMLButtonElement> {
    getValue(): string | null;
    setValue(v: string | null): void;
    setOptions(next: (SelectOption | string)[]): void;
    setDisabled(d: boolean): void;
    getState(): EditState;
    setState(s: EditState): void;
}
export declare function createSelect(host: HTMLElement, opts?: SelectOptions): SelectHandle;
