import { type ModalHandle } from "./ds-modal.js";
export interface RenameOptions {
    title?: string;
    label?: string;
    value?: string;
    confirmLabel?: string;
    validate?: (value: string) => string | null;
    /** Let "" commit (default: an empty value disables Confirm). For dialogs where clearing the value
     *  IS an action — "empty name removes the group" — not for names, which need to exist. */
    allowEmpty?: boolean;
    onCancel?: () => void;
    onConfirm?: (value: string) => void;
}
export type RenameHandle = ModalHandle;
export declare function createRename(opts?: RenameOptions): RenameHandle;
