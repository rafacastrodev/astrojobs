import { r as rectsOverlap, t as MarqueeOptions } from "../marquee-CC1ZhFa5.js";

//#region src/select/select.d.ts
interface SelectableOptions<V = string> {
  /** Fires whenever the marquee selection changes, with the current selected values. */
  onSelect?: (selected: V[]) => void;
  /** Draw the marquee rectangle. Default `true`. Style via `--neodrag-marquee-fill` / `-stroke`. */
  box?: boolean;
}
interface SelectBindOptions<V = string> extends SelectableOptions<V> {
  /** Fires on every selection change — the reactive-mirror seam for framework wrappers. */
  onChange?: (selected: V[]) => void;
}
/**
 * Framework-agnostic, DOM-aware rubber-band multi-select, built on the engine: the region is a
 * `Draggable` running the `marqueeSelect` plugin (so it gets the same pointer-capture, sensors and
 * text-selection suppression every gesture does), and it never translates. Register the region with
 * `container(el)` and each selectable child with `item(value, el)` (each returns a disposer). Selected
 * items get a `data-neodrag-selected` attribute to style; read the live set from `selected`. Framework
 * wrappers map the register methods to refs/attachments and mirror `onChange`; vanilla uses it directly.
 */
declare class Selectable<V = string> {
  #private;
  constructor(options?: SelectBindOptions<V>);
  /** The live set of selected values. */
  get selected(): Set<V>;
  /** Clear the selection programmatically. */
  clear(): void;
  /** Register the selectable region. Returns a disposer. */
  container(el: HTMLElement): () => void;
  /** Register a selectable child for `value`. Returns a disposer. */
  item(value: V, el: HTMLElement): () => void;
}
//#endregion
export { type MarqueeOptions, type SelectBindOptions, Selectable, type SelectableOptions, rectsOverlap };