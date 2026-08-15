//#region src/swipe/swipe.d.ts
type SwipeAxis = 'x' | 'y';
type SwipeResult = {
  dismissed: true;
  direction: -1 | 1;
} | {
  dismissed: false;
};
/**
 * Decide a swipe's outcome from the released offset (px) and the element's size along the axis.
 * `threshold` is a fraction of the size when `<= 1`, otherwise an absolute px distance. Pure.
 */
declare function resolveSwipe(offset: number, size: number, threshold?: number): SwipeResult;
interface SwipeState {
  offset: {
    x: number;
    y: number;
  };
  dismissed: boolean;
}
interface SwipeOptions {
  /** Swipe axis. Default `'x'`. */
  axis?: SwipeAxis;
  /** Dismiss distance — a fraction of the element's size when `<= 1` (default `0.4`), else px. */
  threshold?: number;
  /** Animation duration (ms) for the settle (spring-back or fly-out). Default `220`. */
  duration?: number;
  /** Fires after the element flies out past the threshold. `direction` is `-1` (left/up) or `1`. */
  onDismiss?: (direction: -1 | 1) => void;
}
interface SwipeBindOptions extends SwipeOptions {
  /** Fires on every offset/dismissed change — the reactive-mirror seam for framework wrappers. */
  onChange?: (state: SwipeState) => void;
}
/**
 * Framework-agnostic, DOM-aware swipe-to-dismiss binder, built on the core `Draggable`: the element
 * follows the pointer on one axis; released past `threshold` it flies out and fires `onDismiss`,
 * otherwise it springs back. Register the element with `attach(el)` (returns a disposer); read live
 * `offset` / `isDismissed`. Framework wrappers map `attach` to a ref/attachment and mirror `onChange`;
 * vanilla uses it directly.
 */
declare class Swipeable {
  #private;
  readonly axis: SwipeAxis;
  constructor(options?: SwipeBindOptions);
  /** Live offset (px). */
  get offset(): {
    x: number;
    y: number;
  };
  /** True once the element has been swiped out. */
  get isDismissed(): boolean;
  /** Register the swipeable element. Returns a disposer. */
  attach(el: HTMLElement): () => void;
  /** Spring the element back to rest and clear the dismissed flag (e.g. to re-show it). */
  reset(): void;
}
//#endregion
export { type SwipeAxis, type SwipeBindOptions, type SwipeOptions, type SwipeResult, type SwipeState, Swipeable, resolveSwipe };