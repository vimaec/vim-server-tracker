export interface MenuItem {
    label: string;
    icon?: string;
    /** Colour for `icon` (any CSS colour). Default: the dim text tone — glyph languages read as one
     *  family in monochrome; give colour only to the one state that earns it. */
    iconColor?: string;
    /** A colour swatch before the label (any CSS colour) — enum values that HAVE a colour, like a
     *  severity, show it where the choice is made. */
    dot?: string;
    /** Dim trailing context after the label — a count, a position, a shortcut. The label is the
     *  content; the hint is the context, so it renders quiet and last. */
    hint?: string;
    /** A sentence that explains the row, shown as a tooltip on hover. The label stays the content;
     *  the tip is for what the label cannot say in a word or two. */
    tip?: string;
    disabled?: boolean;
    selected?: boolean;
    onClick?: (item: MenuItem) => void;
}
export type MenuEntry = MenuItem | "separator";
export interface MenuOptions {
    items?: MenuEntry[];
}
export interface MenuHandle {
    el: HTMLDivElement;
    openAt(x: number, y: number): void;
    openUnder(anchor: HTMLElement): void;
    close(): void;
    setItems(next: MenuEntry[]): void;
    destroy(): void;
}
export declare function createMenu(opts?: MenuOptions): MenuHandle;
