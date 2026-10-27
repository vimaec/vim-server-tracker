import { type DsHandle } from "../dom.js";
export interface SkeletonOptions {
    variant?: "text" | "block";
    count?: number;
    width?: number | string;
    height?: number | string;
}
export interface SkeletonHandle extends DsHandle<HTMLDivElement> {
}
export declare function createSkeleton(host: HTMLElement, opts?: SkeletonOptions): SkeletonHandle;
