import { type DsHandle } from "../dom.js";
export interface PathChipOptions {
    path?: string;
    onOpen?: (path: string) => void;
}
export interface PathChipHandle extends DsHandle<HTMLDivElement> {
    setPath(p?: string | null): void;
}
export declare function createPathChip(host: HTMLElement, opts?: PathChipOptions): PathChipHandle;
