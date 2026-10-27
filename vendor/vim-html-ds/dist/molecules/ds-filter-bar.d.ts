import { type DsHandle } from "../dom.js";
export interface FilterBarFilter {
    key: string;
    op?: string;
    value: string | number;
}
export interface FilterBarOptions {
    filters?: FilterBarFilter[];
    fields?: string[];
    onRemove?: (removed: FilterBarFilter) => void;
    onAdd?: (field: string) => void;
    onClear?: () => void;
}
export interface FilterBarHandle extends DsHandle<HTMLDivElement> {
    getFilters(): FilterBarFilter[];
    setFilters(next: FilterBarFilter[]): void;
}
export declare function createFilterBar(host: HTMLElement, opts?: FilterBarOptions): FilterBarHandle;
