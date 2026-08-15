import { i as LocalPresence, n as CollabTarget, o as PresenceFrame, s as ResizeOp, t as CollabOp } from "./collab-types-Y3M0X2KT.js";
import { a as Capability, c as InteractionSession, d as InteractionInput, o as DndNode, s as EndReason, u as ResolvedTarget } from "./types-G2NWiUm6.js";
import { f as RectLike } from "./drag-CL5U3tM0.js";

//#region src/resize/preserve-units.d.ts
/**
 * Tier-2 resize extension seam — the mirror of `DragPlugin`. A plain object, no reactive
 * slots, no reconcile machinery. `onMove` may return an adjusted size; `onEnd` is the place
 * to commit a final authored value back to the node.
 */
interface ResizePlugin {
  name?: string;
  onStart?(ctx: ResizePluginContext): void;
  onMove?(ctx: ResizePluginContext): {
    width: number;
    height: number;
  } | void;
  onEnd?(ctx: ResizePluginContext): void;
}
interface ResizePluginContext {
  /** Current px size for this frame. */
  size: {
    width: number;
    height: number;
  };
  /** Px size captured at resize-start. */
  initial: {
    width: number;
    height: number;
  };
  anchor: ResizeEdge;
  node: DndNode;
  input: InteractionInput;
}
/**
 * Opt-in plugin that preserves authored CSS units across a resize. On start it reads the
 * authored unit for each axis (e.g. `width: 50%`, `height: 12rem`); throughout the drag the
 * core writes plain `px` so the geometry is exact; on end it converts the final px size back
 * into the original unit and writes it as the committed value — so a `%`-sized box stays
 * `%`-sized after resizing. Ported from `src/length/*` but kept as a tier-2 plugin, not core.
 */
declare function preserveUnits(): ResizePlugin;
//#endregion
//#region src/resize/resize.d.ts
type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
/**
 * Where a resize is allowed to grow into. Mirrors the drag `BoundsInput` shape:
 * `'parent'` (the element's offset/DOM parent), `'viewport'`, an explicit element,
 * a plain rect, or a thunk returning a rect (re-read each move so a moving/scrolling
 * container stays correct). Ported from `src/resize-bounds.ts` (`parent` concept) but
 * widened to the full bounds vocabulary the drag side already speaks.
 */
type ResizeBoundsInput = 'parent' | 'viewport' | HTMLElement | RectLike | (() => RectLike);
interface ResizeBoundsContext {
  /** Layout rect of the element at resize-start (client coords). */
  readonly start_rect: RectLike;
  /** Inverse scale so the bounds math lives in the same space as the size math. */
  readonly inverse_scale: number;
}
/** Resolve a `ResizeBoundsInput` into a concrete client-space rect (or undefined). */
declare function resolveResizeBounds(bounds: ResizeBoundsInput | undefined, node: DndNode): RectLike | undefined;
/**
 * Clamp a proposed size so the element — anchored at its non-moving edge — never
 * spills outside `bounds`. The moving edge is implied by `anchor`: e.g. an `e` resize
 * keeps the left edge pinned and may only grow until it touches `bounds.right`; a `w`
 * resize keeps the right edge pinned and is limited by `bounds.left`. Symmetric for n/s.
 *
 * `width`/`height` come in already in element (layout) px; `bounds` and `start_rect` are
 * in client px, so we divide the slack by `inverse_scale` to convert back to layout px —
 * matching how `sizeFromPointer` scales the pointer delta. Pure + DOM-free for testing.
 */
declare function clampSizeToBounds(width: number, height: number, anchor: ResizeEdge, bounds: RectLike, start_rect: RectLike, inverse_scale: number): {
  width: number;
  height: number;
};
declare const RESIZE_HANDLE_ATTR = "data-neodrag-resize-handle";
/** All eight resize edges/corners — iterate to render a handle per edge. */
declare const RESIZE_EDGES: readonly ResizeEdge[];
/** Per-handle binding — spread onto a handle element (`<div {...resize.handle('se')}>`) instead of
 *  writing the `data-neodrag-resize-handle` attribute by hand. `edge` is type-checked. */
type ResizeHandleProps = {
  readonly [RESIZE_HANDLE_ATTR]: ResizeEdge;
};
interface ResizeSizeBounds {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}
interface ResizeEventData {
  width: number;
  height: number;
  /** Position offset (px) the gesture induced — non-zero only for `w`/`n` edges, which move the
   * top-left to pin the far edge. Same offset space as a draggable's `position`. */
  x: number;
  y: number;
  edge: ResizeEdge;
  node: DndNode;
  input: InteractionInput;
}
interface ResizeOptions extends ResizeSizeBounds {
  /** Lock aspect ratio. `true` keeps the initial ratio; a number is explicit width/height. */
  aspectRatio?: number | boolean;
  /**
   * Constrain the resize to stay inside a container rect: `'parent'`, `'viewport'`, an
   * element, a plain rect, or a thunk. The fixed (anchored) edge is pinned and the moving
   * edge can only travel until it reaches the bound.
   */
  bounds?: ResizeBoundsInput;
  /**
   * Controlled size in px. Pass a reactive getter (`get size() { … }`) to drive width/height
   * externally; pair it with a setter for two-way binding (the wrapper writes the live size back
   * each move). Applied only while no local resize owns the node, so a gesture isn't fought.
   */
  size?: {
    width: number;
    height: number;
  };
  /**
   * Controlled position offset (px), in the same offset space as a draggable's `position`. A
   * `w`/`n` resize moves the top-left to pin the far edge; this reads/writes that shift. Pass a
   * getter to drive it and a setter for two-way binding.
   */
  position?: {
    x: number;
    y: number;
  };
  disabled?: boolean;
  /** Suppress body text-selection while resizing (refcounted `user-select: none`, applied by the
   * engine for every interaction). Default `true`; set `false` to allow selection during a resize. */
  userSelect?: boolean;
  /** Tier-2 extension plugins (e.g. `preserveUnits()`). Static array, no reactivity. */
  use?: ResizePlugin[];
  /**
   * Stable string id for this resizable — the `target` in the unified collab op grammar. Required
   * in practice for collab (it must match across peers); an auto id is peer-local.
   */
  id?: string;
  onResizeStart?: (e: ResizeEventData) => void;
  onResize?: (e: ResizeEventData) => void;
  onResizeEnd?: (e: ResizeEventData) => void;
  /**
   * Pure op stream — fires a serializable `{ type:'resize', target, width, height }` once per resize
   * that actually changed the size, on release. The last-write-wins seam `@neodrag/collab`
   * subscribes to; composes with (never replaces) `onResizeEnd`.
   */
  onCommit?: (op: ResizeOp) => void;
}
/** A mutable width/height pair reused across the move pipeline to avoid per-move allocs. */
interface SizePair {
  width: number;
  height: number;
}
/** In-flight resize presence — the `resize` variant of the unified presence frame. */
type ResizePresence = {
  type: 'resize';
  target: string;
  width: number;
  height: number;
  left?: number;
  top?: number;
};
declare class ResizeState {
  readonly node: DndNode;
  options: ResizeOptions;
  edge: ResizeEdge;
  width: number;
  height: number;
  initial_width: number;
  initial_height: number;
  initial_pointer_x: number;
  initial_pointer_y: number;
  inverse_scale: number;
  ratio: number;
  start_rect: RectLike | null;
  bounds: RectLike | undefined;
  /** Committed position offset (px) — the translate a `w`/`n` resize induces to pin the far edge.
   * Persists across gestures (like a draggable's offset) and is the resize's `TRANSLATE_RESIZE`
   * contribution, so it composes with a draggable on the same node. */
  readonly offset: {
    x: number;
    y: number;
  };
  /** Offset snapshot at gesture start, so the in-flight shift is cumulative on prior resizes. */
  start_offset_x: number;
  start_offset_y: number;
  /** Reused scratch for the per-move size pipeline (sizeFromPointer → aspect → clamp). */
  readonly size: SizePair;
  /** True while a local resize gesture owns the node — remote applies defer to it. */
  resizing: boolean;
  /** Auto target id — peer-local; `targetId` prefers `options.id`. */
  readonly auto_target_id: string;
  readonly commit_subscribers: Set<(op: ResizeOp) => void>;
  readonly presence_subscribers: Set<(p: ResizePresence | null) => void>;
  /** The peer whose remote resize is currently rendered over this node, or null. */
  remote_peer: string | null;
  /** A remote op that arrived while a local resize owned the node — applied on end if the local
   * gesture produced no commit, so a suppressed remote value isn't lost. */
  pending_remote: ResizeOp | null;
  constructor(node: DndNode, options: ResizeOptions);
  get targetId(): string;
  get hasExplicitId(): boolean;
  event(input: InteractionInput): ResizeEventData;
  pluginContext(input: InteractionInput): ResizePluginContext;
}
declare class ResizeHandle {
  #private;
  constructor(resize: Resize, state: ResizeState);
  update(options: Partial<ResizeOptions>): void;
  get size(): {
    width: number;
    height: number;
  };
  /** The committed position offset (px) — the translate a `w`/`n` resize induced. Same offset
   * space as a draggable's `position`. */
  get position(): {
    x: number;
    y: number;
  };
  /** The resizable's stable string id — the `target` in the unified op grammar. */
  get targetId(): string;
  /** Whether `targetId` came from an explicit `id` option (auto ids are peer-local). */
  get hasExplicitId(): boolean;
  onCommit(fn: (op: CollabOp) => void): () => void;
  onPresence(fn: (p: LocalPresence | null) => void): () => void;
  /** Apply a remote resize fact — sizes the node to the committed dimensions (eased). Foreign kinds
   * ignored — this is the unified `CollabTarget.applyExternal`. */
  applyExternal(op: CollabOp): void;
  showRemotePresence(frame: PresenceFrame): void;
  clearRemotePresence(peerId?: string): void;
  destroy(): void;
}
/**
 * The resize capability. Claims pointerdowns that land on a handle element
 * (`data-neodrag-resize-handle="se"`), at a higher priority than drag so the handle wins
 * over the body. px-only: size is written in pixels; unit preservation is an opt-in plugin.
 */
declare class Resize implements Capability {
  #private;
  readonly key: symbol;
  readonly name = "resize";
  readonly priority = 100;
  bind(node: DndNode, options?: ResizeOptions): ResizeHandle;
  /** @internal */
  _unbind(node: DndNode): void;
  resolve(input: InteractionInput): ResolvedTarget | null;
  start(session: InteractionSession): void;
  move(session: InteractionSession): void;
  end(session: InteractionSession, _reason: EndReason): void;
  /** Apply a remote resize fact — size the node to the committed dimensions, eased. A no-op while a
   *  local resize owns the node (stashed, applied on end if the local gesture commits nothing). */
  applyExternal(state: ResizeState, op: ResizeOp): void;
  showRemotePresence(state: ResizeState, frame: ResizePresence & {
    peerId: string;
  }): void;
  clearRemotePresence(state: ResizeState, peerId?: string): void;
}
//#endregion
//#region src/resize/resizable.d.ts
/** Ergonomic single-element resize: `new Resizable(node, options)`. Satisfies the unified
 *  {@link CollabTarget} seam, so `room.add(resizable)` works. */
declare class Resizable implements CollabTarget {
  #private;
  constructor(node: DndNode, options?: ResizeOptions);
  update(options: Partial<ResizeOptions>): void;
  get size(): {
    width: number;
    height: number;
  };
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
export { ResizePluginContext as _, ResizeBoundsContext as a, ResizeEventData as c, ResizeOptions as d, ResizeSizeBounds as f, ResizePlugin as g, resolveResizeBounds as h, Resize as i, ResizeHandle as l, clampSizeToBounds as m, RESIZE_EDGES as n, ResizeBoundsInput as o, ResizeState as p, RESIZE_HANDLE_ATTR as r, ResizeEdge as s, Resizable as t, ResizeHandleProps as u, preserveUnits as v };