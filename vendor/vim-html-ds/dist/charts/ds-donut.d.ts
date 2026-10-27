import { type DsHandle } from "../dom.js";
export interface DonutPart {
    name: string;
    value: number;
    color?: string;
}
export interface DonutOptions {
    parts?: DonutPart[];
    centerValue?: string | number;
    centerLabel?: string;
    size?: number;
    thickness?: number;
    onSlice?: (part: DonutPart, index: number) => void;
}
export interface DonutHandle extends DsHandle<HTMLDivElement> {
    setParts(parts: DonutPart[]): void;
    setCenter(value?: string | number, label?: string): void;
}
export declare function createDonut(host: HTMLElement, opts?: DonutOptions): DonutHandle;
