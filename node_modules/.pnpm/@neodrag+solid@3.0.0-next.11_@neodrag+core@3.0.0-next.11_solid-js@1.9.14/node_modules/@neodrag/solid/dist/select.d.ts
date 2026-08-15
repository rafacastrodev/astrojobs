import { Accessor } from "solid-js";
import { MarqueeOptions, SelectableOptions, SelectableOptions as SelectableOptions$1, rectsOverlap } from "@neodrag/core/select";

//#region src/select.d.ts
type RefSetter = (node: HTMLElement | null) => void;
/**
 * Rubber-band multi-select primitive — a thin adapter over the core `Selectable` binder (the region
 * is a `Draggable` running the `marqueeSelect` plugin). Put `container` on the region's `ref` and
 * `item(value)` on each child's `ref`. `selected()` is the live array of selected values; selected
 * items also carry a `data-neodrag-selected` attribute to style.
 */
declare function createSelect<V = string>(options?: SelectableOptions$1<V>): {
  container: RefSetter;
  item: (value: V) => RefSetter;
  selected: Accessor<V[]>;
  clear: () => void;
};
//#endregion
export { type MarqueeOptions, type SelectableOptions, createSelect, rectsOverlap };