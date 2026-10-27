import { type DsHandle } from "../dom.js";
export type StepState = "todo" | "active" | "done" | "blocked";
export interface StepDef {
    label: string;
    caption?: string;
    state?: StepState;
}
export interface StepsOptions {
    steps?: (string | StepDef)[];
    active?: number;
    orientation?: "horizontal" | "vertical";
    canJump?: (index: number) => boolean;
    onStep?: (index: number) => void;
}
export interface StepsHandle extends DsHandle<HTMLDivElement> {
    getActive(): number;
    setActive(i: number): void;
}
export declare function createSteps(host: HTMLElement, opts?: StepsOptions): StepsHandle;
