import { type DsHandle } from "../dom.js";
export interface MatchBarAction {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
}
export interface MatchBarOptions {
    matched: number;
    total?: number;
    byIdCount?: number;
    sql?: string;
    actions?: MatchBarAction[];
}
export interface MatchBarHandle extends DsHandle<HTMLDivElement> {
    setMatched(matched: number, total?: number): void;
    setById(byIdCount: number): void;
    setSql(sql?: string): void;
}
export declare function createMatchBar(host: HTMLElement, opts: MatchBarOptions): MatchBarHandle;
