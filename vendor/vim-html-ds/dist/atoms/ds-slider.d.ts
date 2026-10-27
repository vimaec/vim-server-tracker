import { type DsHandle } from "../dom.js";
export interface SliderOptions {
    min?: number;
    max?: number;
    step?: number;
    value?: number;
    disabled?: boolean;
    onInput?: (value: number) => void;
    onChange?: (value: number) => void;
}
export interface SliderHandle extends DsHandle<HTMLInputElement> {
    getValue(): number;
    setValue(v: number): void;
    setDisabled(d: boolean): void;
}
export declare function createSlider(host: HTMLElement, opts?: SliderOptions): SliderHandle;
