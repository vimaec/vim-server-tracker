export interface WindowInput {
    scrollTop: number;
    viewportHeight: number;
    rowHeight: number;
    rowCount: number;
    overscan?: number;
}
export interface WindowSlice {
    firstIndex: number;
    lastIndex: number;
    count: number;
    offsetY: number;
    totalHeight: number;
}
/** Compute which rows to render for the current scroll position. */
export declare function windowRange(input: WindowInput): WindowSlice;
