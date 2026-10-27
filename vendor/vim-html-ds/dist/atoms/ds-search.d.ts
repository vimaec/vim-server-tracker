import { type DsHandle } from "../dom.js";
export interface SearchOptions {
    placeholder?: string;
    value?: string;
    onInput?: (value: string) => void;
    /** Set, the search COMMITS: Enter, or a click on the magnifier (which becomes a button), hands the
     *  field's value here, and so does the clear button (with ""). For a search whose answer is too
     *  costly to ask for on every keystroke; `onInput` still reports each one. */
    onSubmit?: (value: string) => void;
    /** Maximum characters (also caps a paste); default DEFAULT_SEARCH_MAX — a search term, not a document. */
    maxLength?: number;
}
export declare const DEFAULT_SEARCH_MAX = 200;
export interface SearchHandle extends DsHandle<HTMLDivElement> {
    getValue(): string;
    setValue(v: string): void;
    focus(): void;
}
export declare function createSearch(host: HTMLElement, opts?: SearchOptions): SearchHandle;
