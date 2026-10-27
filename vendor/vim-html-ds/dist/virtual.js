// Fixed-height windowing math for the .ds-tree--virtual scaffold. Pure — no DOM, no per-row
// allocation. The DS deliberately keeps row rendering in the consumer's hands (rows are rebuilt every
// scroll frame; a factory per row would cost in the hot path); this only owns the scroll arithmetic
// every consumer would otherwise re-implement. Wire the result to the scaffold:
//   spacer.style.height = totalHeight + "px";
//   rows.style.transform = "translateY(" + offsetY + "px)";
//   render rows[firstIndex .. lastIndex]   (lastIndex inclusive)
/** Compute which rows to render for the current scroll position. */
export function windowRange(input) {
    const { scrollTop, viewportHeight, rowHeight, rowCount } = input;
    const overscan = input.overscan ?? 6;
    const totalHeight = Math.max(0, rowCount) * rowHeight;
    if (rowCount <= 0 || rowHeight <= 0)
        return { firstIndex: 0, lastIndex: -1, count: 0, offsetY: 0, totalHeight };
    const firstVisible = Math.floor(scrollTop / rowHeight);
    const visibleCount = Math.ceil(viewportHeight / rowHeight);
    const firstIndex = Math.max(0, firstVisible - overscan);
    const lastIndex = Math.min(rowCount - 1, firstVisible + visibleCount + overscan);
    return { firstIndex, lastIndex, count: lastIndex - firstIndex + 1, offsetY: firstIndex * rowHeight, totalHeight };
}
