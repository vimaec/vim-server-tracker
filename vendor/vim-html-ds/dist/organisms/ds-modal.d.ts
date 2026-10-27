import { type DsHandle } from "../dom.js";
export interface ModalOptions {
    title?: string;
    variant?: "confirm";
    /** A fixed width from the DS scale — sm 360px, md 480px, lg 640px — so dialogs line up with each
     *  other and their body content (a progress bar, a field) can simply fill it. Omitted, the dialog
     *  sizes to its content between 320px and 90vw. */
    size?: "sm" | "md" | "lg";
    closeOnBackdrop?: boolean;
    onClose?: () => void;
    /** false: the dialog closes only through its own controls (a Cancel in its foot) or `close()` -
     *  no ×, and neither a backdrop press nor Esc closes it. For a dialog that stands for work in
     *  flight, where closing would only hide what is still happening. Default true. */
    dismissible?: boolean;
}
export interface ModalHandle extends DsHandle<HTMLDivElement> {
    body: HTMLDivElement;
    foot: HTMLDivElement;
    open: () => void;
    close: () => void;
    setTitle: (t: string) => void;
}
export declare function createModal(opts?: ModalOptions): ModalHandle;
