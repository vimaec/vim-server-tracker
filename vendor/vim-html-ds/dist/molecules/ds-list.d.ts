import { type DsHandle } from "../dom.js";
export interface ListItemAction {
    /** Glyph text (see ds-icon-button: "browse" | "clear" | "folder" | any literal glyph). */
    icon: string;
    /** Tooltip + aria-label. For a disabled action, say WHY it is disabled. */
    tip: string;
    disabled?: boolean;
    danger?: boolean;
    onClick: (item: ListItem) => void;
}
export interface ListItem {
    id?: string;
    label: string;
    meta?: string | number | null;
    icon?: string;
    /** Row tooltip. The place for the precision a row cannot afford to show: an exact timestamp behind
     *  a relative one, the full breakdown behind a digest. Actions keep their own tips. */
    tip?: string;
    render?: (item: ListItem) => Node;
    /** Trailing icon actions on the row (Play, an overflow menu trigger, ...). */
    actions?: ListItemAction[];
    /** The row is present but has nothing to offer — a choice that would change nothing, an option
     *  this context cannot use. It reads dim and still clicks; say why in `tip`. */
    dim?: boolean;
}
export interface ListOptions {
    selectable?: boolean;
    selected?: string | null;
    items?: ListItem[];
    empty?: string | Node;
    loading?: boolean;
    virtual?: {
        rowHeight: number;
        overscan?: number;
    };
    /** Bound the list's height and scroll inside it (px number, or any CSS length). A plain list has
     *  no scroll of its own and grows with its items, so a list placed in a fixed band needs this —
     *  and it is also how a `virtual` list gets the bounded height its windowing requires. */
    maxHeight?: number | string;
    onSelect?: (id: string, item: ListItem) => void;
}
export interface ListHandle extends DsHandle<HTMLDivElement> {
    setItems(items: ListItem[]): void;
    getSelected(): string | null;
    setSelected(id: string | null): void;
}
export declare function createList(host: HTMLElement, opts?: ListOptions): ListHandle;
