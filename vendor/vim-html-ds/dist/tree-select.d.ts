export type TriState = "on" | "partial" | "off";
export interface TriNode {
    id: string;
    children?: TriNode[];
}
/** Every leaf id at or under `node` (the node itself when it has no children). */
export declare function leafIds(node: TriNode): string[];
/** `node`'s state given the selected leaf set: on = all leaves selected, off = none, else partial. */
export declare function triState(node: TriNode, selected: ReadonlySet<string>): TriState;
/** Toggle `node`: fully-on clears its leaves; off/partial selects them all (partial → on, matching
 *  the checkbox convention). Returns a NEW set — the input is not mutated. */
export declare function toggleTri(node: TriNode, selected: ReadonlySet<string>): Set<string>;
/** The contiguous run of ids between `a` and `b` (inclusive) in `order` — the Shift-range primitive
 *  for a flattened list. Order-independent (a/b may be given either way); [] if either is absent. */
export declare function rangeBetween(order: string[], a: string, b: string): string[];
