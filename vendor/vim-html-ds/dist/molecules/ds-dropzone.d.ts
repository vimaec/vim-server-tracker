import { type DsHandle } from "../dom.js";
export interface DropzoneOptions {
    title?: string;
    hint?: string;
    accept?: string[];
    onDrop?: (files: File[]) => void;
    onBrowse?: () => void;
}
export interface DropzoneHandle extends DsHandle<HTMLDivElement> {
}
export declare function createDropzone(host: HTMLElement, opts?: DropzoneOptions): DropzoneHandle;
