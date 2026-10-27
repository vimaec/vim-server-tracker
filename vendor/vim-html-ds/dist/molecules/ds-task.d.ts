import { type DsHandle } from "../dom.js";
export interface TaskOptions {
    label?: string;
    onCancel?: () => void;
}
export interface TaskHandle extends DsHandle<HTMLDivElement> {
    setLabel(t: string): void;
    setProgress(v01: number): void;
    setBusy(): void;
    fail(why?: string): void;
    done(): void;
}
export declare function createTask(host: HTMLElement, opts?: TaskOptions): TaskHandle;
