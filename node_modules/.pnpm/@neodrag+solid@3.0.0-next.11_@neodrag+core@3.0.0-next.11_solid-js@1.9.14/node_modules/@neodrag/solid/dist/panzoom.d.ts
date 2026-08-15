import { Accessor } from "solid-js";
import { PanZoomBindOptions, PanZoomBindOptions as PanZoomBindOptions$1, PanZoomOptions, PanZoomTransform, PanZoomTransform as PanZoomTransform$1 } from "@neodrag/core/panzoom";

//#region src/panzoom.d.ts
type RefSetter = (node: HTMLElement | null) => void;
/**
 * Pan/zoom canvas primitive — a thin adapter over the core `PanZoom` binder (which owns the pan
 * drag, wheel/pinch zoom, and the world transform). Put `viewport` on the clipping element's `ref`
 * and `world` on the inner content layer's `ref`; read live `scale()` / `x()` / `y()` / `transform()`.
 */
declare function createPanZoom(options?: PanZoomBindOptions$1): {
  viewport: RefSetter;
  world: RefSetter;
  scale: Accessor<number>;
  x: Accessor<number>;
  y: Accessor<number>;
  transform: Accessor<PanZoomTransform$1>;
  zoomBy: (factor: number, cx?: number, cy?: number) => void;
  zoomTo: (scale: number, cx?: number, cy?: number) => void;
  panBy: (dx: number, dy: number) => void;
  setTransform: (t: Partial<PanZoomTransform$1>) => void;
  reset: () => void;
};
//#endregion
export { type PanZoomBindOptions, type PanZoomOptions, type PanZoomTransform, createPanZoom };