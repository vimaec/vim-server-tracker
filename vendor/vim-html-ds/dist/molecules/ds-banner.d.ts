import { type DsHandle } from "../dom.js";
import { type ButtonOptions } from "../atoms/ds-button.js";
export interface BannerOptions {
    tone?: "info" | "good" | "warn" | "bad";
    text?: string;
    action?: ButtonOptions;
    dismissible?: boolean;
    onClose?: () => void;
}
export interface BannerHandle extends DsHandle<HTMLDivElement> {
    setText(t: string): void;
}
export declare function createBanner(host: HTMLElement, opts?: BannerOptions): BannerHandle;
