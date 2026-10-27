import { el, handle } from "../dom.js";
export function createDropzone(host, opts = {}) {
    const root = el("div", "ds-dropzone");
    root.tabIndex = 0;
    root.appendChild(el("span", "ds-dropzone__title", opts.title ?? "Drop a file here"));
    const hint = opts.hint ?? ((opts.accept ?? []).join(" · ") + (opts.onBrowse ? " — or click to browse" : ""));
    if (hint)
        root.appendChild(el("span", "ds-dropzone__hint", hint));
    const ok = (name) => !opts.accept?.length || opts.accept.some((ext) => name.toLowerCase().endsWith(ext));
    root.addEventListener("dragover", (e) => { e.preventDefault(); root.classList.add("ds-over"); });
    root.addEventListener("dragleave", () => root.classList.remove("ds-over"));
    root.addEventListener("drop", (e) => {
        e.preventDefault();
        root.classList.remove("ds-over");
        const files = [...(e.dataTransfer?.files ?? [])].filter((f) => ok(f.name));
        if (files.length)
            opts.onDrop?.(files);
    });
    if (opts.onBrowse)
        root.addEventListener("click", () => opts.onBrowse());
    host.appendChild(root);
    return handle(root, {});
}
