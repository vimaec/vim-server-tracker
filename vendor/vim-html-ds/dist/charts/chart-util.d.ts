export declare function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs?: Record<string, string | number>): SVGElementTagNameMap[K];
export declare function chartRoot(host: HTMLElement): HTMLDivElement;
export interface LegendEntry {
    label: string;
    color: string;
}
export declare function legend(root: HTMLElement, entries: LegendEntry[]): HTMLDivElement;
export declare const seriesColor: (i: number) => string;
export interface ColorScale {
    (key: string): string;
    keys: string[];
}
export declare function colorScale(keys: string[]): ColorScale;
