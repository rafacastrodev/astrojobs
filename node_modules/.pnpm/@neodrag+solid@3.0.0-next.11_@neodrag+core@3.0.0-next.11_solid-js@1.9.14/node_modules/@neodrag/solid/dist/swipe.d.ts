import { Accessor } from "solid-js";
import { SwipeAxis, SwipeOptions, SwipeOptions as SwipeOptions$1, SwipeResult, resolveSwipe } from "@neodrag/core/swipe";

//#region src/swipe.d.ts
type RefSetter = (node: HTMLElement | null) => void;
/**
 * Swipe-to-dismiss primitive — a thin adapter over the core `Swipeable` binder. Put `ref` on the
 * element; read `offset()` / `isDismissed()`. Released past `threshold` the element flies out and
 * fires `onDismiss`, otherwise it springs back.
 */
declare function createSwipe(options?: SwipeOptions$1): {
  ref: RefSetter;
  offset: Accessor<{
    x: number;
    y: number;
  }>;
  isDismissed: Accessor<boolean>;
  reset: () => void;
};
//#endregion
export { type SwipeAxis, type SwipeOptions, type SwipeResult, createSwipe, resolveSwipe };