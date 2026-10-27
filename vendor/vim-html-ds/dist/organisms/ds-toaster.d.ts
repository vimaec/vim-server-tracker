import { type DsHandle } from "../dom.js";
export interface ToastOptions {
    text?: string;
    tone?: "cyan" | "good" | "warn" | "bad";
    timeout?: number;
}
export interface ToasterOptions {
    timeout?: number;
}
export interface ToasterHandle extends DsHandle<HTMLDivElement> {
    show(toast?: ToastOptions): () => void;
}
export declare function createToaster(opts?: ToasterOptions): ToasterHandle;
