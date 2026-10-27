// Tri-state selection arithmetic over a hierarchy. Pure logic, no DOM — the same relationship
// color.ts has with heat cells: the consumer owns the rows and the selection set; this computes the
// on/partial/off state and the cascade so every consumer (the ds-tree factory AND an app's
// virtualized tree) shares one correct implementation instead of re-deriving it.
//
// Model: the selection is a Set of LEAF ids. A group's state is always DERIVED from its leaves, so
// ancestors never need explicit reconciliation — recompute triState() after any change and every
// level is consistent. A node with no children is itself a leaf.
/** Every leaf id at or under `node` (the node itself when it has no children). */
export function leafIds(node) {
    if (!node.children?.length)
        return [node.id];
    const out = [];
    for (const c of node.children)
        out.push(...leafIds(c));
    return out;
}
/** `node`'s state given the selected leaf set: on = all leaves selected, off = none, else partial. */
export function triState(node, selected) {
    const leaves = leafIds(node);
    if (leaves.length === 0)
        return "off";
    let on = 0;
    for (const id of leaves)
        if (selected.has(id))
            on++;
    return on === 0 ? "off" : on === leaves.length ? "on" : "partial";
}
/** Toggle `node`: fully-on clears its leaves; off/partial selects them all (partial → on, matching
 *  the checkbox convention). Returns a NEW set — the input is not mutated. */
export function toggleTri(node, selected) {
    const next = new Set(selected);
    const leaves = leafIds(node);
    if (triState(node, selected) === "on")
        for (const id of leaves)
            next.delete(id);
    else
        for (const id of leaves)
            next.add(id);
    return next;
}
/** The contiguous run of ids between `a` and `b` (inclusive) in `order` — the Shift-range primitive
 *  for a flattened list. Order-independent (a/b may be given either way); [] if either is absent. */
export function rangeBetween(order, a, b) {
    const i = order.indexOf(a), j = order.indexOf(b);
    if (i < 0 || j < 0)
        return [];
    return i <= j ? order.slice(i, j + 1) : order.slice(j, i + 1);
}
