import { type DsHandle } from "../dom.js";
export interface TreeItem {
    id?: string;
    label: string;
    meta?: string | number | null;
    open?: boolean;
    children?: TreeItem[];
    /** Optional typed badge rendered before the meta (a generic tier tag — the consumer's vocabulary). */
    tag?: string | null;
    /** Custom label content (chips/swatches) instead of the plain label text. */
    render?: (item: TreeItem) => Node;
    /** Checkbox state when the tree is `checkable` (the "solid" variant). */
    checked?: "on" | "partial" | "off";
    /** Render the row as locked/pinned (the persistent "solid" selection bar). */
    locked?: boolean;
}
export interface TreeOptions {
    items?: TreeItem[];
    selected?: string | null;
    /** Render a fixed-left checkbox column per row (the "solid" tree). */
    checkable?: boolean;
    /** "multi-tristate" lets the tree own a leaf-id selection set and derive each row's on/partial/off
     *  via the tri-state helper — toggling a group cascades. (Implies a checkbox column.) */
    selectionMode?: "single" | "multi-tristate";
    checkedIds?: string[];
    empty?: string | Node;
    loading?: boolean;
    onToggle?: (item: TreeItem) => void;
    onSelect?: (id: string, item: TreeItem) => void;
    onCheck?: (item: TreeItem) => void;
    onCheckedChange?: (ids: string[]) => void;
}
export interface TreeHandle extends DsHandle<HTMLDivElement> {
    setItems(next: TreeItem[]): void;
    getSelected(): string | null;
    setSelected(id: string | null): void;
    /** multi-tristate only: the selected LEAF ids. */
    getCheckedIds(): string[];
    setCheckedIds(ids: string[]): void;
}
export declare function createTree(host: HTMLElement, opts?: TreeOptions): TreeHandle;
