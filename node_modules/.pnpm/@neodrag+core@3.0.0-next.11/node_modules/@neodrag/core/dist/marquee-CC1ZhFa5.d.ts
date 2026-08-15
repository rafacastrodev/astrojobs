import { l as DragPlugin } from "./drag-CL5U3tM0.js";

//#region src/extend/marquee.d.ts
type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};
/** Do two axis-aligned rects overlap? Pure. */
declare function rectsOverlap(a: Rect, b: Rect): boolean;
interface MarqueeOptions {
  /** Draw the selection rectangle. Default `true`. Style via `--neodrag-marquee-fill` / `-stroke`. */
  box?: boolean;
}
/**
 * Rubber-band selection as a `use: []` drag plugin — a real engine gesture, not a bolt-on. Put a
 * `Draggable` on the region; dragging it draws a marquee (the region never translates — the plugin
 * returns `{ x: 0, y: 0 }`) and reports the items it touches via `onSelect` (fired each move). The
 * drag anchor is recovered as `pointer − offset`, so no per-gesture state is captured.
 *
 * `getItems` returns the selectable elements (re-read at each gesture start).
 */
declare function marqueeSelect(getItems: () => ArrayLike<Element>, onSelect: (selected: Element[]) => void, options?: MarqueeOptions): DragPlugin;
//#endregion
export { marqueeSelect as n, rectsOverlap as r, MarqueeOptions as t };