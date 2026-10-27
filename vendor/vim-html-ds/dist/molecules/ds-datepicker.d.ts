import { type DsHandle } from "../dom.js";
export interface DatePickerOptions {
    /** Current ISO yyyy-mm-dd value ("" = none). The view opens on its month (today's if empty). */
    value?: string;
    yearMin?: number;
    yearMax?: number;
    /** The committed pick: an ISO date, or "" when Clear was pressed. */
    onCommit: (iso: string) => void;
    /** Cancel / outside click / Escape — nothing committed. */
    onCancel?: () => void;
}
export interface InlineDatePickerOptions {
    value?: string;
    yearMin?: number;
    yearMax?: number;
    /** Fires on every day click (immediately) and on Clear (""). */
    onChange?: (iso: string) => void;
}
export interface DatePickerHandle extends DsHandle<HTMLDivElement> {
    close(): void;
}
export interface InlineDatePickerHandle extends DsHandle<HTMLDivElement> {
    getValue(): string;
    setValue(iso: string): void;
}
/** The INLINE calendar: always visible, a day click commits immediately; Clear commits "". */
export declare function createDatePicker(host: HTMLElement, opts?: InlineDatePickerOptions): InlineDatePickerHandle;
/** The POPOVER form (the full AS anatomy): tentative until OK; Clear commits ""; Cancel, outside
 *  click, and Escape discard. Sized to content — never scrollbars. */
export declare function openDatePicker(anchor: HTMLElement, opts: DatePickerOptions): DatePickerHandle;
