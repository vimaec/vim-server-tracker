import { type ModalHandle } from "./ds-modal.js";
export interface ConfirmOutcome {
    label: string;
    ok: boolean;
    note?: string;
}
export interface ConfirmOptions {
    title?: string;
    text?: string;
    cancelLabel?: string;
    confirmLabel?: string;
    destructive?: boolean;
    requireText?: string;
    requirePlaceholder?: string;
    onCancel?: () => void;
    onConfirm?: () => void;
}
export interface ConfirmHandle extends ModalHandle {
    showResult(items: ConfirmOutcome[], doneLabel?: string): void;
}
export declare function openConfirm(opts?: Omit<ConfirmOptions, "onConfirm" | "onCancel">): Promise<boolean>;
export declare function createConfirm(opts?: ConfirmOptions): ConfirmHandle;
