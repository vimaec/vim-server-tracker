import { type DsHandle } from "../dom.js";
import { createStat } from "../molecules/ds-stat.js";
export interface CardOptions {
    title?: string;
    sub?: string;
    keyline?: boolean;
}
export interface CardHandle extends DsHandle<HTMLDivElement> {
    body: HTMLDivElement;
    actions: HTMLDivElement | null;
    statBand(): HTMLDivElement;
    addStat(band: Parameters<typeof createStat>[0], statOpts?: Parameters<typeof createStat>[1]): ReturnType<typeof createStat>;
}
export declare function createCard(host: HTMLElement, opts?: CardOptions): CardHandle;
