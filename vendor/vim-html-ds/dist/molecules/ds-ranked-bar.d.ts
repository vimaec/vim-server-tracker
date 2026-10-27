import { type DsHandle } from "../dom.js";
export interface RankItem {
    id: string;
    rank: 1 | 2 | 3 | 4;
    label: string;
    count?: number;
}
export interface RankedBarOptions {
    items?: RankItem[];
    expanded?: boolean;
    title?: string;
    onActivate?: (item: RankItem) => void;
}
export interface RankedBarHandle extends DsHandle<HTMLDivElement> {
    setItems(items: RankItem[]): void;
    setExpanded(v: boolean): void;
}
export declare function createRankedBar(host: HTMLElement, opts?: RankedBarOptions): RankedBarHandle;
