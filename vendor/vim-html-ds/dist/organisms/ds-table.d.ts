import { type DsHandle, type EditState, type Tone } from "../dom.js";
import { type SelectOption } from "../atoms/ds-select.js";
import { type MenuEntry } from "../molecules/ds-menu.js";
export type TableCellValue = string | number | null | undefined;
export type CellEditor = {
    kind: "text";
} | {
    kind: "number";
    format?: "int" | "float";
} | {
    kind: "enum";
    options: (SelectOption | string)[];
} | {
    kind: "date";
} | {
    kind: "note";
    placeholder?: string;
};
export type TableRow = Record<string, TableCellValue>;
export interface TableColumn {
    id: string;
    label?: string;
    /** A colour swatch before the header label — for columns ABOUT a coloured value (a severity
     *  count column wears the severity's colour). Same language as SelectOption.dot. */
    headerDot?: string;
    /** A glyph before the header label (+ optional colour, default dim) — for columns about a STATE
     *  (a status count column wears the status's shape). Same language as SelectOption.icon. */
    headerIcon?: string;
    headerIconColor?: string;
    numeric?: boolean;
    sortable?: boolean;
    editable?: boolean;
    format?: (value: TableCellValue) => string;
    /** Custom read-cell content (chips, pills, swatches). Takes precedence over format for display. */
    render?: (row: TableRow) => Node;
    /** Exclude a numeric column from the totals footer (default: numeric columns total). */
    total?: boolean;
    /** Starting width in px (resizable grids only); also the width a double-click resets to. */
    width?: number;
    /** Width floor for this column while dragging (default 48). */
    minWidth?: number;
    /** Width ceiling for this column while dragging (default: none). */
    maxWidth?: number;
    /**
     * Per-column value filter: a funnel in the header opens the distinct values of that column as
     * checkboxes (plus an All master), and unchecking hides those rows. For the columns a reader thinks in
     * CATEGORIES about — status, severity, assignee — where "show me only these" is faster than sorting
     * and reading. Numeric measures are not that; leave them off.
     *
     * State is stored as the EXCLUDED values, which is what makes it survive new data: a value the
     * user never rejected arrives visible, and one they did stays hidden even if it disappears and
     * comes back.
     *
     * `"number"` is the measure-column counterpart: the funnel opens a COMPARISON (>= > = < <=) plus a
     * threshold, because "show me the big ones" is a range question that a list of distinct values
     * cannot ask. `=` compares what is ON SCREEN (the column's `format` applied to both sides) so a
     * user can type the value they are looking at; the ordering operators compare the raw number.
     *
     * `"date"` is the same comparison over ISO dates, with the threshold picked in a ds-date-field
     * (typed yyyy-mm-dd or the calendar). ISO strings order chronologically, so the operators read as
     * on-or-after / after / on / before / on-or-before; a cell with a timestamp compares by its date
     * part. Blank cells fail every comparison, in all three flavours.
     */
    filter?: "values" | "number" | "date";
}
export type CompareOp = ">=" | ">" | "=" | "<" | "<=";
/** A "number" or "date" column's active filter: number thresholds are numbers, dates ISO strings. */
export interface CompareFilter {
    op: CompareOp;
    value: number | string;
}
export interface TableBand {
    id: string;
    label: string;
    columns: string[];
    tone?: Tone;
    collapsed?: boolean;
    representative?: string;
}
export interface TableSort {
    id: string;
    dir: 1 | -1;
}
export interface TableSelect {
    mode: "single" | "multi";
    /** multi only: render the checkbox column + header select-all. */
    checkboxes?: boolean;
    /** Open on a row, and never end up empty by accident. See the note above for the three cases. */
    seedFirst?: boolean;
    /** multi only: a tri-state control in the header that selects every row or clears the selection.
     *  Redundant with `checkboxes` (that header cell already does it); this is for a table whose rows
     *  are selected by CLICK, where there is otherwise nowhere to say "all" or "none". */
    allNone?: boolean;
    /** multi + checkboxes only: what a row-body click drives. See the note above. */
    rowClick?: "soft" | "toggle";
}
export interface TableOptions {
    columns?: TableColumn[];
    rows?: TableRow[];
    sort?: TableSort | null;
    maxHeight?: number | string;
    /** Window the body: only the rows in and around the wrap's viewport are in the DOM, a spacer row
     *  above and below standing in for the rest, so a table over tens of thousands of rows scrolls with
     *  ~40 <tr>s. Every body row is exactly `rowHeight` tall (cells clip instead of wrapping) — the
     *  spacer arithmetic depends on it. Needs a bounded viewport (`maxHeight` or `fill`). Sorting,
     *  filters, selection (click, Shift ranges, checkboxes) and edit cells work as in a plain table;
     *  `groupBy`, `bands` and `rowDrag` are not combinable with it. */
    virtual?: {
        rowHeight: number;
        overscan?: number;
    };
    /** Grow into the host's leftover space instead of capping at maxHeight: the rows viewport becomes
     *  the flex-filling scroller. The host must be a flex column with a bounded height (the same
     *  contract a virtualizing tree puts on its host). maxHeight is ignored. */
    fill?: boolean;
    /** A grab bar under the table drags the rows viewport taller or shorter. The dragged size is a
     *  REAL height, not a cap — the viewport can be pulled larger than its rows, claiming space from
     *  the layout below (the splitter gesture). Double-click (or Home on the focused bar) resets to
     *  content-sized under the declared maxHeight. Ignored with fill — a filling table's height
     *  belongs to the layout around it. */
    heightResizable?: boolean;
    /** Height floor for the drag, px (default 64 — header plus a row or two). */
    minHeight?: number;
    /** Ceiling for the drag, measured at drag start — the layout's business: "the panel minus what
     *  the sections below must keep". Without it the bar can starve everything under the table. */
    maxHeightOf?: () => number;
    /** The user dragged the height bar: the new height in px, or null when a reset returned it to
     *  content-sized. Persist this to restore the height on reload via setHeight. */
    onHeightResize?: (height: number | null) => void;
    /** Omit for a plain display table (no selection UI at all). */
    select?: TableSelect;
    /** Stable row identity. WITH it, selection survives setRows (rows are re-found by key); without
     *  it, setRows clears the selection — honest, where index-based survival would silently land on
     *  whatever row inherited the index. */
    rowKey?: (row: TableRow) => string;
    groupBy?: string;
    /**
     * Grows `groupBy`'s display-only bands into REAL group heads: one row per group with a collapse
     * caret, the group name and the member count — nothing else; the cells stay clean. To edit a whole
     * group, click its head (the members become the soft selection) and edit any member: the edit fans
     * out over the layer it lands in. Rows whose group value is ""/null gather under `ungroupedLabel`
     * (default "Ungrouped"), LAST — named groups are the curated output, the ungrouped pool is the
     * tail you drain. Without this option, groupBy keeps its bands.
     */
    groups?: {
        ungroupedLabel?: string;
    };
    /**
     * The hard/soft split, for checkbox tables: with `select.checkboxes` on, EVERY row-body click —
     * plain, Ctrl, Shift — drives a SOFT multi-selection (blue rows), and only the checkbox column
     * touches the hard (checked) set. Two layers, two gestures, two visuals; there is no third state.
     * Soft is the staging gesture, the checkbox the commit: checking a box on a row INSIDE the soft
     * selection applies that row's target state to the whole soft selection (shift-select twenty,
     * one click checks them all). `seedFirst` seeds the SOFT layer here — checkmarks are strictly
     * user-made. Ignored without checkboxes, where the body click stays the selection it always was.
     */
    onSoftSelect?: (rows: TableRow[]) => void;
    /**
     * Row drag & drop between groups (needs groupBy + groups). Dragging starts after a small movement
     * threshold from a row-body press — a plain click still focuses/selects. Dragging a SELECTED row
     * drags the whole selection (the same rule bulk edits follow); an unselected row drags alone.
     * Drop targets are group heads and other rows (whose group is the target); the drop is DELEGATED:
     * the consumer writes and refreshes. Document-level tracking, no pointer capture (OSR-safe).
     */
    rowDrag?: {
        onDropToGroup: (dragged: TableRow[], group: string) => void;
    };
    totals?: boolean;
    bands?: TableBand[];
    empty?: string | Node;
    loading?: boolean;
    editableCell?: (row: TableRow, columnId: string) => boolean;
    cellEditor?: (row: TableRow, columnId: string) => CellEditor | null;
    cellState?: (row: TableRow, columnId: string) => EditState;
    rowTone?: (row: TableRow) => Tone | null;
    /**
     * Wash the whole row, for a quality worth SCANNING for rather than reading — a regression, a
     * severity, a row that is done. The left keyline of `rowTone` marks a row as tagged; a tint marks
     * it as DIFFERENT, which is what a reader picking rows out of a full table needs.
     *
     * A tone name (the wash is that token, translucent) or `"muted"` (the row recedes: grey wash, dim
     * text) or null for no tint. Return null for the MAJORITY case — a table where most rows are
     * tinted reads as a tinted table, and nothing stands out. Selection and hover still win.
     */
    rowTint?: (row: TableRow) => Tone | "muted" | null;
    rowMenu?: (row: TableRow) => MenuEntry[];
    /**
     * Freeze the first column as the sticky identity column (default true). It carries a darker
     * surface so it reads as pinned while the rest scrolls under it — which is noise in a table
     * narrow enough never to scroll, where it just looks like one oddly dark column.
     */
    stickyIdentity?: boolean;
    /** Drag a header divider to resize the column left of it; double-click the divider to reset.
     *  Switches the grid to fixed layout, so widths become authoritative instead of content-derived. */
    resizable?: boolean;
    onSelect?: (rows: TableRow[]) => void;
    /** A column filter changed: the new state (columnId -> excluded values). Fires on the gesture only,
     *  never on setRows/setColumns. A page that counts what it is showing needs this — otherwise its
     *  own row count describes a table the user is no longer looking at. */
    onFilter?: (state: Record<string, string[] | CompareFilter>) => void;
    onEdit?: (row: TableRow, columnId: string, value: string | number) => void;
    /** A column's new width, or null when a double-click reset it to auto. Persist this to give a
     *  workflow's columns manager the widths back on reload. */
    onResize?: (columnId: string, width: number | null) => void;
    /** A header click changed the order — the new sort, or null once the cycle returns to the query's
     *  own order. For a consumer that remembers the order across instances. */
    onSort?: (sort: TableSort | null) => void;
}
export interface TableHandle extends DsHandle<HTMLDivElement> {
    setRows(next: TableRow[]): void;
    /** Replace the column set and rebuild. What survives, and why: keyed selection (identities are
     *  rows, not columns), explicit widths for columns that persist, and the sort — unless its column
     *  left, in which case the sort clears rather than pointing at nothing. Exists so a page whose
     *  columns depend on state (a metric only meaningful above some threshold) does not have to
     *  destroy and recreate the whole table to add or drop one. */
    setColumns(next: TableColumn[]): void;
    getSelected(): TableRow[];
    /** Replace the selection by key (requires rowKey). Unknown keys are ignored; [] means none. */
    setSelected(keys: string[]): void;
    clearSelection(): void;
    /** Force a full structural rebuild — after a change an in-place edit can't reflect (sort order,
     *  another row, a band's collapsed cell). Ordinary edits update in place and need no refresh. */
    refresh(): void;
    /** Is any column filter hiding rows right now. */
    isFiltered(): boolean;
    /** The rows that pass the current column filters, in base order (all of them when unfiltered). */
    getVisibleRows(): TableRow[];
    /** Drop every column filter. For the moment the table starts describing something else — another
     *  test, another project — where a filter carried over from the last one hides rows for a reason
     *  the user cannot see any more. Does not fire onFilter (nobody gestured). */
    clearFilters(): void;
    /** The soft (glance) selection, in row order (checkbox tables — see TableOptions.onSoftSelect). */
    getSoftSelected(): TableRow[];
    /** Set the soft selection programmatically. SILENT by default — a programmatic write is the
     *  caller's own statement, so echoing it back through onSoftSelect makes every caller suppress
     *  its own callback (the rule selection writes follow). Pass `notify: true` to fire
     *  onSoftSelect like a click would — a test simulating the user, a control acting AS the user
     *  (the Select all button does). */
    setSoftSelected(ids: ReadonlyArray<string | number>, opts?: {
        notify?: boolean;
    }): void;
    /** The ids of every row the current filters let through, in base order (the displayed sort is
     *  not applied) — what "select all" means (a hidden row is not selectable; see clearFilters'
     *  honesty rule). */
    getVisibleRowIds(): (string | number)[];
    /** Scroll a row into view, expanding its collapsed group first. No-op for an unknown or
     *  filtered-out id. */
    revealRow(id: string | number): void;
    /** The active filters: columnId -> the EXCLUDED values (a "values" column) or the comparison (a
     *  "number" column). Empty object when nothing is filtered. Persist this to give a workflow its
     *  filters back on reload. */
    getFilterState(): Record<string, string[] | CompareFilter>;
    /** Explicitly-set column widths, keyed by column id (band id for a collapsed band strip). */
    getColumnWidths(): Record<string, number>;
    setColumnWidths(next: Record<string, number>): void;
    /** Give the rows viewport a real height in px (restoring a persisted onHeightResize value), or
     *  null to return to content-sized under the declared maxHeight — the height bar's own semantics. */
    setHeight(px: number | null): void;
}
export declare function createTable(host: HTMLElement, opts?: TableOptions): TableHandle;
export declare function createTableSelectAll(host: HTMLElement, table: TableHandle, opts?: {
    label?: string;
}): DsHandle<HTMLButtonElement>;
