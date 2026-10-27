import { type DsHandle } from "../dom.js";
export type ConfidenceTier = "high" | "med" | "low" | "excluded";
export interface ConfidenceChipOptions {
    tier?: ConfidenceTier;
}
export interface ConfidenceChipHandle extends DsHandle<HTMLSpanElement> {
    setTier(tier: ConfidenceTier): void;
}
export declare function createConfidenceChip(host: HTMLElement, opts?: ConfidenceChipOptions): ConfidenceChipHandle;
