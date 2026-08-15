import { i as LocalPresence, o as PresenceFrame, t as CollabOp } from "../collab-types-Y3M0X2KT.js";
import { u as Room } from "../index-knsTeVKP.js";
import { l as DragPlugin } from "../drag-CL5U3tM0.js";

//#region src/panzoom/panzoom.d.ts
interface PanZoomTransform {
  /** World translate x in viewport px. */
  x: number;
  /** World translate y in viewport px. */
  y: number;
  /** World scale (1 = 100%). */
  scale: number;
}
interface PanZoomOptions {
  /** Smallest allowed scale. Default `0.1`. */
  minScale?: number;
  /** Largest allowed scale. Default `8`. */
  maxScale?: number;
  /** Initial scale. Default `1`. */
  scale?: number;
  /** Initial translate x (viewport px). Default `0`. */
  x?: number;
  /** Initial translate y (viewport px). Default `0`. */
  y?: number;
  /** Stable string id — the `target` in the unified collab op grammar. Required in practice for
   * collab (it must match across peers); an auto id is peer-local. */
  id?: string;
  /** Fires on every change — pan move, zoom, or programmatic set. The live-binding seam. */
  onChange?: (t: PanZoomTransform) => void;
  /** Pure op stream — a `{ type: 'panzoom', target, x, y, scale }` fact on every settled change
   * (pan release, zoom, programmatic set). The last-write-wins seam `@neodrag/collab` subscribes to. */
  onCommit?: (op: CollabOp) => void;
}
/**
 * Framework-agnostic pan/zoom viewport math. Holds the world's `{ x, y, scale }` transform and the
 * scale clamp, and keeps the point under the cursor fixed while zooming (the Figma/Miro move). It
 * never touches the DOM — applying the transform to the world layer and wiring pan/wheel/pinch input
 * is the wrapper's job. `x`/`y` are viewport-space px (pan is 1:1 with the pointer at any zoom);
 * `transformString()` assumes the world layer has `transform-origin: 0 0`.
 */
declare class PanZoomController {
  #private;
  x: number;
  y: number;
  scale: number;
  constructor(options?: PanZoomOptions);
  /** The viewport's stable string id — the `target` in the unified op grammar. */
  get targetId(): string;
  get hasExplicitId(): boolean;
  /** The current transform as a plain object. */
  get transform(): PanZoomTransform;
  /** A CSS `transform` value for the world layer (needs `transform-origin: 0 0`). */
  transformString(): string;
  /** Replace any subset of the transform (programmatic / controlled set) and sync it. */
  setTransform(t: Partial<PanZoomTransform>): void;
  /** Translate the world by `(dx, dy)` viewport px. */
  panBy(dx: number, dy: number): void;
  /**
   * Zoom to an absolute `scale`, keeping the viewport-local point `(cx, cy)` fixed on screen so the
   * content under the cursor doesn't drift. No-op once clamped against the scale bounds.
   */
  zoomTo(scale: number, cx: number, cy: number): void;
  /** Multiply the scale by `factor`, keeping `(cx, cy)` fixed. */
  zoomBy(factor: number, cx: number, cy: number): void;
  /** Restore the initial transform. */
  reset(): void;
  /** Snapshot the translate at gesture start so the move is computed from a stable base. */
  beginPan(): void;
  /** Set the translate to the start plus the drag offset (viewport px). Streams live presence. */
  panTo(offsetX: number, offsetY: number): void;
  endPan(): void;
  /** The Room only ever passes `{ id }`. */
  update(options: {
    id?: string;
  }): void;
  onCommit(fn: (op: CollabOp) => void): () => void;
  onPresence(fn: (p: LocalPresence | null) => void): () => void;
  /** Apply a remote transform — last-write-wins. A no-op while a local pan owns the viewport (the
   *  local gesture wins). Foreign kinds ignored. */
  applyExternal(op: CollabOp): void;
  /** Render a remote peer's in-flight pan/zoom — set the live transform (no-op during a local pan). */
  showRemotePresence(frame: PresenceFrame): void;
  clearRemotePresence(): void;
}
/**
 * Drag plugin that pans a `PanZoomController`. The viewport is a `Draggable` running this plugin; on
 * each move it feeds the drag offset to the controller (which translates the *world* layer) and
 * returns `{ x: 0, y: 0 }` so the viewport element itself never translates — exactly the marquee
 * pattern. Spread the viewport with `Draggable({ use: [pan(controller)] })`.
 */
declare function pan(controller: PanZoomController): DragPlugin;
interface PanZoomBindOptions extends PanZoomOptions {
  /** Wheel-zoom sensitivity — scale multiplier per wheel delta unit. Default `0.0015`. */
  wheelSpeed?: number;
  /** Join a collab room — the viewport's transform syncs as a `panzoom` op (a shared canvas). */
  room?: Room;
}
/**
 * Framework-agnostic, DOM-aware pan/zoom binder — the engine-built infinite canvas. The **viewport**
 * is a `Draggable` running the `pan` plugin (drag empty space to pan) plus wheel and two-finger pinch
 * zoom toward the cursor; the **world** layer is the only thing that transforms. Register the two
 * elements with `viewport(el)` / `world(el)` (each returns a disposer, so they bind independently and
 * in any order), and read the live transform from `scale` / `x` / `y`. Framework wrappers map the two
 * register methods to refs/attachments and mirror `onChange` into reactive state; vanilla uses it
 * directly.
 */
declare class PanZoom {
  #private;
  constructor(options?: PanZoomBindOptions);
  /** The underlying collab target — its transform syncs across a room. */
  get target(): PanZoomController;
  get scale(): number;
  get x(): number;
  get y(): number;
  get transform(): PanZoomTransform;
  /** Register the clipping viewport element. Returns a disposer. */
  viewport(el: HTMLElement): () => void;
  /** Register the inner content layer that pans and zooms. Returns a disposer. */
  world(el: HTMLElement): () => void;
  /** Multiply the scale by `factor`, keeping `(cx, cy)` viewport-local fixed (default: centre). */
  zoomBy(factor: number, cx?: number, cy?: number): void;
  /** Zoom to an absolute scale, keeping `(cx, cy)` viewport-local fixed (default: centre). */
  zoomTo(scale: number, cx?: number, cy?: number): void;
  panBy(dx: number, dy: number): void;
  setTransform(t: Partial<PanZoomTransform>): void;
  reset(): void;
}
//#endregion
export { PanZoom, type PanZoomBindOptions, PanZoomController, type PanZoomOptions, type PanZoomTransform, pan };