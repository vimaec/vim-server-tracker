import { type DsHandle } from "../dom.js";
export interface NumberInputOptions {
    min?: number;
    max?: number;
    step?: number;
    /** Displayed decimals. Default: the step's own (0.5 → 1, 1 → 0). Pass it when the values carry
     *  more precision than the step — a whole-number nudge over fractional offsets. */
    decimals?: number;
    value?: number;
    disabled?: boolean;
    /** Committed value — Enter or blur on the field, ArrowUp/ArrowDown, a click on ▴/▾, and once at
     *  the end of a drag-scrub. */
    onChange?: (value: number) => void;
    /** Live value while the ▴▾ stack is being scrubbed — one call per tick the gesture crosses,
     *  already clamped and formatted. Preview only: the committed value still arrives through
     *  `onChange` when the pointer is released, and a scrub cancelled with Escape reports the
     *  drag-start value here with no `onChange` at all. */
    onInput?: (value: number) => void;
}
export interface NumberInputHandle extends DsHandle<HTMLDivElement> {
    getValue(): number;
    setValue(v: number): void;
    setDisabled(d: boolean): void;
}
export declare function createNumberInput(host: HTMLElement, opts?: NumberInputOptions): NumberInputHandle;
