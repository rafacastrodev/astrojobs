import { i as LocalPresence, n as CollabTarget, o as PresenceFrame, t as CollabOp } from "./collab-types-Y3M0X2KT.js";
import { a as Capability, c as InteractionSession, l as InteractionsOptions, o as DndNode, u as ResolvedTarget } from "./types-G2NWiUm6.js";
import { t as Interactions } from "./engine-Dr5fQvhL.js";
import { _ as dragAnchor, a as Drag, c as DragOptions, d as Point, f as RectLike, g as constrainGrid, h as constrainBounds, i as BoundsTarget, l as DragPlugin, m as constrainAxis, n as BoundsInput, o as DragEventData, p as constrain, r as BoundsPadding, s as DragHandle, t as Axis, u as DragState, v as proposedOffset } from "./drag-CL5U3tM0.js";
import { C as VirtualCollisionIndex, D as intersectionArea, E as edgeDistanceSq, O as rankDrop, S as RankContext, T as centerDistanceSq, _ as LinearCollisionIndex, a as CollisionIndex, b as RafBatch, c as DropAcceptCtx, d as DropHandle, f as DropHoverPresence, g as DropState, h as DropSampler, i as Droppable, k as resolveSampler, l as DropEngineOptions, m as DropSampleMode, n as NativeDrag, o as CollisionPolicy, p as DropOptions, r as enableNativeDnd, s as Drop, t as NATIVE_DRAG_KEY, u as DropEventData, v as REMOTE_HOVER_ATTR, w as VirtualCollisionOptions, x as RankCandidate, y as REMOTE_HOVER_MARKER_ATTR } from "./index-CWWXLb3J.js";
import { _ as ResizePluginContext, a as ResizeBoundsContext, c as ResizeEventData, d as ResizeOptions, f as ResizeSizeBounds, g as ResizePlugin, h as resolveResizeBounds, i as Resize, l as ResizeHandle, m as clampSizeToBounds, n as RESIZE_EDGES, o as ResizeBoundsInput, p as ResizeState, r as RESIZE_HANDLE_ATTR, s as ResizeEdge, t as Resizable, u as ResizeHandleProps, v as preserveUnits } from "./index-CMCi0iD8.js";
import { A as gridDisplacements, B as resolveForeignInsertAt, C as animateToOffset, D as computeTargetFromMids, E as computeGridOverIndex, F as playFlip, G as stabilizeForeignInsertAt, H as scoreTarget, I as recordFlipRects, K as stabilizeInsertAt, L as releaseNode, M as moveLiftedNode, N as moveOpFromIndices, O as createTransferState, P as placeholderRect, R as reorderKeys, S as TransferState, T as buildMids, U as slotBoundariesFromMids, V as resolveTransferTarget, W as sortableKey, _ as SortablePresence, a as ItemRect, b as TransferOp, c as MoveOp, d as SortAxis, f as SortStrategy, g as SortableOptions, h as SortableHandle, i as GridCollision, j as liftNode, k as fixedLocalCoords, l as SORTABLE_KEY_ATTR, m as SortableContext, n as SortableRow, o as LiftState, p as Sortable, r as FLIP_MOVE_THRESHOLD_PX, s as MidEntry, t as SortableList, u as SORTABLE_LIFTED_ATTR, v as TargetFromMidsOptions, w as applyMove, x as TransferRegistry, y as TransferContainer, z as resolveAnimationDuration } from "./index-C19DtXPg.js";
import { n as marqueeSelect, r as rectsOverlap, t as MarqueeOptions } from "./marquee-CC1ZhFa5.js";

//#region src/transform.d.ts
declare function applyTranslate(node: DndNode, x: number, y: number, key?: symbol): void;
/**
 * Remove a translate contribution. With a `key`, drop just that capability's part and re-compose
 * the rest; without one, clear the node entirely (legacy whole-node reset used by sortable/ghost).
 */
declare function clearTranslate(node: DndNode, key?: symbol): void;
//#endregion
//#region src/shared.d.ts
declare function sharedEngine(): Interactions;
declare function sharedCapability<T extends Capability>(token: unknown, make: () => T): T;
//#endregion
//#region src/units.d.ts
/**
 * CSS-length adapter — the px↔unit math, capability-agnostic and tree-shakeable. The core commits
 * geometry in `px` (exact); this lets a `use: []` plugin round-trip an authored unit (a `%`-box
 * stays `%`, a `rem`-box stays `rem`). Used by the resize `preserveUnits()` plugin, and public so
 * any custom drag/resize plugin can do unit-aware commits on whatever CSS length it writes.
 */
type CssLengthUnit = 'px' | '%' | 'rem' | 'em' | 'ch' | 'ex' | 'vw' | 'vh' | 'vmin' | 'vmax';
type LengthAxis = 'width' | 'height';
/** Anchored + linear (ReDoS-safe) matcher for a single `<number><unit>` length token. */
declare const CSS_LENGTH_PATTERN: RegExp;
interface ParsedLength {
  value: number;
  unit: CssLengthUnit;
}
/** Compact length value — integers bare, floats trimmed to 4dp (`37.5`, not `37.5000`). */
declare function formatLength(n: number): string;
/** Parse a single CSS length token (`'50%'`, `'12rem'`), or null if it isn't one. */
declare function parseLength(raw: string): ParsedLength | null;
/** Convert a px measurement into `unit` for the given axis (`%` is parent-relative). */
declare function pxToUnit(px: number, unit: CssLengthUnit, axis: LengthAxis, node: DndNode): number;
/** The authored inline (then computed) length on an axis, if it's a single length token. */
declare function readAuthoredAxis(node: DndNode, axis: LengthAxis): string | null;
/** `px` re-expressed in `authored`'s unit, formatted (`'37.5%'`), or null if `authored` isn't a
 * length token. One-call helper for unit-preserving commits. */
declare function pxToAuthored(px: number, authored: string, axis: LengthAxis, node: DndNode): string | null;
//#endregion
//#region src/drag/draggable.d.ts
/**
 * Ergonomic single-element class API: `new Draggable(node, options)`. Routes through the
 * shared engine + `Drag` capability so importing only `Draggable` pulls in just the drag
 * path (no drop/resize/sortable). Satisfies the unified {@link CollabTarget} seam, so
 * `room.add(draggable)` works.
 */
declare class Draggable implements CollabTarget {
  #private;
  constructor(node: DndNode, options?: DragOptions);
  /** Targeted, fine-grained update — only the provided keys are written. */
  update(options: Partial<DragOptions>): void;
  get offset(): Point;
  get isDragging(): boolean;
  /** Register a descendant as a drag **handle** — once any exist, a drag may start only from inside
   * one. `priority` overrides the innermost-wins nesting cascade. Returns an idempotent disposer. */
  registerHandle(node: DndNode, opts?: {
    priority?: number;
  }): () => void;
  /** Register a descendant as a **cancel** zone — a drag may never start from inside it. Returns an
   * idempotent disposer. */
  registerCancel(node: DndNode, opts?: {
    priority?: number;
  }): () => void;
  get targetId(): string;
  get hasExplicitId(): boolean;
  onCommit(fn: (op: CollabOp) => void): () => void;
  onPresence(fn: (p: LocalPresence | null) => void): () => void;
  applyExternal(op: CollabOp): void;
  showRemotePresence(frame: PresenceFrame): void;
  clearRemotePresence(peerId?: string): void;
  destroy(): void;
}
//#endregion
//#region src/drag/controls.d.ts
/**
 * Drag start-gating by nested allow/block zones — a richer alternative to the single
 * `handle`/`cancel` whitelist/blacklist. Overlapping zones resolve by area: the smallest zone
 * containing the pointer wins, with a configurable allow-vs-block tie-break. Built into Draggable
 * via the `controls` option (it hard-gates the start, unlike a post-start `use:[]` plugin could).
 */
type ControlZone = {
  element: Element;
  top: number;
  right: number;
  bottom: number;
  left: number;
  area: number;
};
type ZonesFrom = (root: Element) => ControlZone[];
declare const ControlFrom: {
  /**
   * Build control zones from a CSS selector. The string is passed to `querySelectorAll` —
   * supply a developer-trusted/static selector, never one built from untrusted input.
   */
  selector(selector: string): ZonesFrom;
  elements(elements: ArrayLike<Element | null | undefined>): ZonesFrom;
};
/**
 * Decide whether a point lands in an allow or block zone — the tie-break ladder. `allow_defined`
 * is whether any allow zones were configured at all (an empty allow set with allow configured
 * means "block everything not explicitly allowed").
 */
declare function resolveControl(allow: ControlZone[], block: ControlZone[], allow_defined: boolean, priority?: 'allow' | 'block'): {
  zone: ControlZone | null;
  isAllow: boolean;
};
/** A control region: a CSS selector or element (sugar), or `ControlFrom.*` for nested zones. */
type ControlInput = string | HTMLElement | ZonesFrom;
/**
 * Built-in drag start-gate. `handle` = where a drag may start (allow), `cancel` = where it may not
 * (block); overlapping zones resolve by area with the `priority` tie-break. A bare selector/element
 * is the simple whitelist/blacklist; `ControlFrom.*` opts into nested-zone resolution.
 */
interface DragControls {
  handle?: ControlInput;
  cancel?: ControlInput;
  priority?: 'allow' | 'block';
}
/** Whether a pointerdown at viewport `(x, y)` inside `root` may start a drag, per `controls`. */
declare function controlAllowsStart(controls: DragControls, root: Element, x: number, y: number): boolean;
//#endregion
//#region src/extend/auto-scroll.d.ts
/**
 * Auto-scroll the nearest scroll container when the pointer drifts into its edge margin —
 * ported from the old `autoScroll` plugin (plugins/drag.ts). Opt-in via `use: []`; reads the
 * live pointer from the move ctx (`input.clientX/Y`) and nudges the container each move tick.
 *
 * Defaults match the old plugin: 48px edge margin, 24px/tick max speed, viewport container.
 */
interface AutoScrollOptions {
  /** Edge band (px) inside which scrolling kicks in. Default 48. */
  margin?: number;
  /** Max px scrolled per move tick. Default 24. */
  maxSpeed?: number;
  /**
   * Scroll container. Default the viewport (scrolls the scrolling element). An element or a
   * lazy getter both work — the getter is re-read each tick so late-mounted containers resolve.
   */
  container?: HTMLElement | (() => HTMLElement);
}
declare function autoScroll(options?: AutoScrollOptions): DragPlugin;
//#endregion
//#region src/extend/scroll-lock.d.ts
/**
 * Freeze scrolling (and text selection / native touch panning) on a container for the
 * duration of a drag — ported from the old `scrollLock` plugin (plugins/drag.ts). Saves the
 * inline styles it touches on start and restores them verbatim on end, so a container that
 * had no inline `overflow`/`touch-action`/`user-select` goes back to having none.
 */
interface ScrollLockOptions {
  /** Which native pan axis to forbid via `touch-action`. Default 'both'. */
  lockAxis?: 'x' | 'y' | 'both';
  /** Container to lock. Default `document.documentElement`. An element or lazy getter. */
  container?: HTMLElement | (() => HTMLElement);
  /** Keep the scrollbar (skip `overflow: hidden`). Default false. */
  allowScrollbar?: boolean;
}
declare function scrollLock(options?: ScrollLockOptions): DragPlugin;
//#endregion
//#region src/extend/ghost.d.ts
/**
 * Drag a floating clone while the original stays put — ported from the old `ghost` plugin
 * (plugins/drag.ts). The clone is mounted in a single shared fixed-position host (overlay
 * layer above everything, pointer-events: none), positioned over the original's start rect,
 * then translated by the live offset each move. The original keeps its place: the core writes
 * a translate to it, so each move we clear that back to zero and translate the clone instead.
 */
interface GhostOptions {
  /** Clone opacity. Default 0.5. */
  opacity?: number;
  /** Clone z-index. Default a near-max overlay value. */
  zIndex?: number;
}
declare function ghost(options?: GhostOptions): DragPlugin;
//#endregion
//#region src/extend/haptics.d.ts
/** A vibration pattern — single duration or an on/off millisecond sequence. */
type Pattern = number | number[];
/**
 * Fire `navigator.vibrate` on drag start/end — the mobile arena's <1KB opt-in.
 * SSR-guarded and a no-op where the Vibration API is unsupported. Defaults to a
 * single 10ms tap on start, silent on end.
 */
declare function haptics(opts?: {
  start?: Pattern;
  end?: Pattern;
}): DragPlugin;
//#endregion
//#region src/extend/aria.d.ts
type AriaDragAnnounce = boolean | {
  grab?: boolean;
  move?: boolean;
  drop?: boolean;
};
type AriaDragOptions = {
  role?: string;
  label?: string;
  liveRegion?: () => HTMLElement | null;
  announce?: AriaDragAnnounce;
};
/**
 * Announce the drag position to an ARIA live region — a tier-2 `use: []` plugin. On start it
 * resolves (or creates) the live region and marks the node grabbed; each move writes the current
 * offset; end clears the region and unmarks the node. Keyboard interactions are the primary
 * audience (pointer drags are visible), so announcements are gated to keyboard input.
 */
declare function ariaDrag(options?: AriaDragOptions | null): DragPlugin;
//#endregion
//#region src/extend/snap-guides.d.ts
type Targets = ArrayLike<Element> | (() => ArrayLike<Element>);
interface SnapGuidesOptions {
  /** Elements to align to — a static array/NodeList, or (better) a getter that returns one. The
   *  property is read fresh at each gesture start, so a `get targets()` getter stays live. */
  targets: Targets;
  /** Snap distance in px — within this, an edge/center locks to a target's. Default `5`. */
  threshold?: number;
  /** Draw the alignment lines while snapped. Default `true`. Style via `--neodrag-snap-guide`. */
  guides?: boolean;
}
/**
 * Alignment-guide snapping — the Figma move. While dragging, the element's edges and center snap
 * to the edges/centers of `options.targets` (other elements) within `threshold` px, and a guide line
 * is drawn at each locked axis. A `use: []` plugin — `new Draggable({ use: [snapGuides({ get
 * targets() { return siblings } })] })`.
 *
 * `targets` is the set of elements to align to (an array/NodeList, a getter, or a function returning
 * one — read fresh at each gesture start). The dragged element is skipped automatically.
 */
declare function snapGuides(options: SnapGuidesOptions): DragPlugin;
//#endregion
//#region src/extend/index.d.ts
/** Spring tuning for `magnetic`'s fling mode. Both are unit-normalized (0–1). */
interface MagneticSpring {
  /** Pull toward the magnet per frame. Higher = snappier. Default 0.2. */
  stiffness?: number;
  /** Velocity retained per frame. Lower = more overshoot/bounce. Default 0.7. */
  damping?: number;
}
interface MagneticOptions {
  /** Outer attraction radius (px). Outside it the drag is free. Default 24. */
  radius?: number;
  /** Inner zone (px from the magnet) that hard-locks. Default `radius * 0.25`. */
  snap?: number;
  /** Max pull within the radius, 0–1. Default 1. */
  strength?: number;
  /** Maps closeness (0 at the radius edge → 1 at the snap zone) to pull. Default ease-in (t²),
   * so the item drifts slowly near the edge then accelerates onto the magnet. */
  easing?: (t: number) => number;
  /** Opt into momentum: the item flings onto the magnet, overshoots, and settles. `true` for
   * defaults, or tune stiffness/damping. Note: integrates only while the pointer is moving. */
  spring?: boolean | MagneticSpring;
}
/**
 * Attract the dragged item to the nearest of `targets` (positions in **offset** space — deltas
 * from where the drag started). Pass a number for the legacy hard-snap-within-radius behavior, or
 * options for a two-zone field: drift toward the magnet inside `radius`, hard-lock inside `snap`.
 * `spring: true` swaps the eased drift for momentum (fling + overshoot + settle).
 */
declare function magnetic(targets: readonly Point[], options?: number | MagneticOptions): DragPlugin;
/** Fire a callback on every drag move — e.g. analytics / telemetry. */
declare function onMove(fn: (offset: Point) => void): DragPlugin;
//#endregion
export { type AriaDragAnnounce, type AriaDragOptions, type AutoScrollOptions, type Axis, type BoundsInput, type BoundsPadding, type BoundsTarget, CSS_LENGTH_PATTERN, type Capability, type CollisionIndex, type CollisionPolicy, ControlFrom, type ControlInput, type ControlZone, type CssLengthUnit, type DndNode, Drag, type DragControls, type DragEventData, DragHandle, type DragOptions, type DragPlugin, DragState, Draggable, Drop, type DropAcceptCtx, type DropEngineOptions, type DropEventData, DropHandle, type DropHoverPresence, type DropOptions, type DropSampleMode, type DropSampler, DropState, Droppable, FLIP_MOVE_THRESHOLD_PX, type GhostOptions, type GridCollision, type InteractionSession, Interactions, type InteractionsOptions, type ItemRect, type LengthAxis, type LiftState, LinearCollisionIndex, MagneticOptions, MagneticSpring, type MarqueeOptions, type MidEntry, type MoveOp, NATIVE_DRAG_KEY, NativeDrag, type ParsedLength, type Point, REMOTE_HOVER_ATTR, REMOTE_HOVER_MARKER_ATTR, RESIZE_EDGES, RESIZE_HANDLE_ATTR, RafBatch, type RankCandidate, type RankContext, type RectLike, Resizable, Resize, type ResizeBoundsContext, type ResizeBoundsInput, type ResizeEdge, type ResizeEventData, ResizeHandle, type ResizeHandleProps, type ResizeOptions, type ResizePlugin, type ResizePluginContext, type ResizeSizeBounds, ResizeState, type ResolvedTarget, SORTABLE_KEY_ATTR, SORTABLE_LIFTED_ATTR, type ScrollLockOptions, type SnapGuidesOptions, type SortAxis, type SortStrategy, Sortable, SortableContext, SortableHandle, SortableList, type SortableOptions, type SortablePresence, type SortableRow, type TargetFromMidsOptions, type TransferContainer, type TransferOp, TransferRegistry, type TransferState, VirtualCollisionIndex, type VirtualCollisionOptions, type ZonesFrom, animateToOffset, applyMove, applyTranslate, ariaDrag, autoScroll, buildMids, centerDistanceSq, clampSizeToBounds, clearTranslate, computeGridOverIndex, computeTargetFromMids, constrain, constrainAxis, constrainBounds, constrainGrid, controlAllowsStart, createTransferState, dragAnchor, edgeDistanceSq, enableNativeDnd, fixedLocalCoords, formatLength, ghost, gridDisplacements, haptics, intersectionArea, liftNode, magnetic, marqueeSelect, moveLiftedNode, moveOpFromIndices, onMove, parseLength, placeholderRect, playFlip, preserveUnits, proposedOffset, pxToAuthored, pxToUnit, rankDrop, readAuthoredAxis, recordFlipRects, rectsOverlap, releaseNode, reorderKeys, resolveAnimationDuration, resolveControl, resolveForeignInsertAt, resolveResizeBounds, resolveSampler, resolveTransferTarget, scoreTarget, scrollLock, sharedCapability, sharedEngine, slotBoundariesFromMids, snapGuides, sortableKey, stabilizeForeignInsertAt, stabilizeInsertAt };