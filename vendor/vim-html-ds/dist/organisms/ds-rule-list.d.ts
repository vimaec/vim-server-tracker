import { type DsHandle } from "../dom.js";
export interface RuleRow {
    id: string;
    label?: string;
    enabled?: boolean;
    count?: number | null;
    tail?: boolean;
    render?: (rule: RuleRow) => Node;
}
export interface RuleListOptions {
    rules?: RuleRow[];
    reorderable?: boolean;
    onChange?: (rules: RuleRow[]) => void;
    onToggle?: (id: string, enabled: boolean) => void;
    onRemove?: (id: string) => void;
    onActivate?: (id: string) => void;
}
export interface RuleListHandle extends DsHandle<HTMLDivElement> {
    setRules(rules: RuleRow[]): void;
    getRules(): RuleRow[];
}
export declare function createRuleList(host: HTMLElement, opts?: RuleListOptions): RuleListHandle;
