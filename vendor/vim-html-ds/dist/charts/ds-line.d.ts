import { type DsHandle } from "../dom.js";
export interface LineSeries {
    name?: string;
    values: number[];
}
export interface LineOptions {
    labels?: string[];
    series?: LineSeries[];
    area?: boolean;
}
export interface LineHandle extends DsHandle<HTMLDivElement> {
    setData(labels: string[], series: LineSeries[]): void;
}
export declare function createLine(host: HTMLElement, opts?: LineOptions): LineHandle;
