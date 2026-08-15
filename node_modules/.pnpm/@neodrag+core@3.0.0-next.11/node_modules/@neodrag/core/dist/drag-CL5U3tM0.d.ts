import { i as LocalPresence, o as PresenceFrame, r as DragOp, t as CollabOp } from "./collab-types-Y3M0X2KT.js";
import { a as Capability, c as InteractionSession, d as InteractionInput, o as DndNode, s as EndReason, u as ResolvedTarget } from "./types-G2NWiUm6.js";

//#region src/drag/drag.d.ts
/** A bounds region by reference (resolved live), or a literal rect. */
type BoundsTarget = 'parent' | 'viewport' | HTMLElement | RectLike | ((node: DndNode) => RectLike);
/** Uniform inset, or per-side. Positive values shrink the bounds inward. */
type BoundsPadding = number | {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};
type BoundsInput = BoundsTarget | {
  target: BoundsTarget;
  padding?: BoundsPadding;
};
/**
 * Tier-1 drag constraints — the common options (axis / grid / bounds), inlined as
 * pure transforms over a proposed offset. No plugin objects, no dispatch: the drag
 * step runs these directly on the hot path. Each is a pure function for testability.
 */
type Axis = 'x' | 'y' | 'both';
type Point = {
  x: number;
  y: number;
};
/** Minimal rect shape — plain numbers so constraints are DOM-free + testable. */
type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};
/** Lock movement to a single axis by zeroing the other component. */
declare function constrainAxis(p: Point, axis: Axis): Point;
/** Snap each component to the nearest grid step. A step of 0 leaves that axis free. */
declare function constrainGrid(p: Point, grid: readonly [number, number]): Point;
/**
 * Clamp the proposed offset so the element — at `start_rect` translated by the offset —
 * stays inside `bounds`. If the element is larger than the bounds on an axis it pins to
 * the start edge (deterministic) rather than producing NaN/invalid clamps.
 */
declare function constrainBounds(p: Point, start_rect: RectLike, bounds: RectLike): Point;
interface ConstrainOptions {
  axis?: Axis;
  grid?: readonly [number, number];
  /** Resolved bounds rect (px). The capability resolves `'parent' | element | …` to this. */
  bounds?: RectLike;
}
/**
 * Run the tier-1 constraint pipeline in a deterministic order: axis → grid → bounds.
 * Order matters — axis first (so a locked axis can't be re-introduced by grid/bounds),
 * grid before bounds (so the snapped position is what gets clamped into range).
 */
declare function constrain(proposed: Point, opts: ConstrainOptions, start_rect?: RectLike): Point;
/**
 * Pointer→offset math with inverse-scale compensation (issue #232).
 *
 * `inverse_scale` is computed ONCE at drag-start (`scaleFromStart` below) and reused for
 * every move — fixing the latent bug where the old engine recalculated it per-move and
 * drifted under transformed ancestors at large coordinates.
 */
/** The anchor captured at drag-start: where the pointer "is" in unscaled element space. */
declare function dragAnchor(clientX: number, clientY: number, start_offset: Point, inverse_scale: number): Point;
/** The proposed offset for the current pointer position, given the start anchor + scale. */
declare function proposedOffset(clientX: number, clientY: number, anchor: Point, inverse_scale: number): Point;
interface DragEventData {
  offset: Point;
  node: DndNode;
  input: InteractionInput;
}
/**
 * Tier-2 extension seam — a plain object, no reactive slots, no reconcile machinery.
 * Custom behavior (magnetic snap, custom constraints, analytics) lives in `@neodrag/extend`
 * and plugs in via `use: [...]`. `onMove` may return an adjusted offset.
 */
interface DragPlugin {
  name?: string;
  onStart?(ctx: DragEventData): void;
  onMove?(ctx: DragEventData): Point | void;
  onEnd?(ctx: DragEventData): void;
  /**
   * Return `true` to request continued frames after the pointer stops — e.g. a spring still
   * settling onto a magnet. The engine re-runs the move pipeline on rAF (replaying the last
   * input, so `onMove` is called again) until every plugin returns `false`.
   */
  animating?(): boolean;
}
interface DragOptions {
  axis?: Axis;
  bounds?: BoundsInput;
  grid?: readonly [number, number];
  disabled?: boolean;
  /**
   * CSS `touch-action` applied to the node so a touch drag isn't hijacked by the browser as a
   * native scroll/zoom. Applied at bind (it must be set *before* the gesture starts). Default is
   * axis-aware: `'pan-y'` for `axis: 'x'`, `'pan-x'` for `axis: 'y'`, `'none'` for free drag.
   * Pass a custom value, or `false` to leave `touch-action` untouched.
   */
  touchAction?: string | false;
  /**
   * Suppress text selection during a drag by setting `user-select: none` on the document body
   * while the drag is active (restored on end). Default `true`; set `false` to allow selection.
   */
  userSelect?: boolean;
  /** Movement threshold in px before a drag begins. Default 0 (immediate). */
  threshold?: number;
  /** Initial / controlled offset. */
  position?: Point;
  /** Arbitrary payload exposed to drop zones (their `accepts`/`onDrop` read it). */
  dragData?: unknown;
  /** Tier-2 extension plugins (from `@neodrag/extend`). Static array, no reactivity. */
  use?: DragPlugin[];
  /**
   * Stable string id for this draggable — the `target` in the unified collab op grammar. Required
   * in practice for collab (it must match across peers); an auto id is peer-local.
   */
  id?: string;
  onDragStart?: (e: DragEventData) => void;
  onDrag?: (e: DragEventData) => void;
  onDragEnd?: (e: DragEventData) => void;
  /**
   * Pure op stream — fires a serializable `{ type:'drag', target, x, y }` once per drag that
   * actually moved the element, on release. The last-write-wins seam `@neodrag/collab` subscribes
   * to; composes with (never replaces) `onDragEnd`.
   */
  onCommit?: (op: DragOp) => void;
}
/** Per-binding drag state. A class per the codebase convention. */
declare class DragState {
  readonly node: DndNode;
  options: DragOptions;
  offset: Point;
  anchor: Point;
  inverse_scale: number;
  start_rect: DOMRect | null;
  bounds: RectLike | undefined;
  dragging: boolean;
  /** The node's original inline `touch-action`, saved when we override it (restored on destroy). */
  saved_touch_action: string | null;
  /** Reused scratch for the per-move proposed offset (before constraints write over it). */
  readonly proposed: Point;
  /**
   * Stable constraint-options object handed to the in-place pipeline each move. Rebuilt in
   * `start()` (and never per-move) so the hot path doesn't allocate the `{axis,grid,bounds}`
   * literal every frame. `bounds` is refreshed each move below when it's a live thunk.
   */
  readonly constrain_opts: ConstrainOptions;
  /** Auto target id — peer-local; `targetId` prefers `options.id`. */
  readonly auto_target_id: string;
  readonly commit_subscribers: Set<(op: DragOp) => void>;
  readonly presence_subscribers: Set<(p: DragPresence | null) => void>;
  /** The peer whose remote drag is currently rendered over this node, or null. */
  remote_peer: string | null;
  /** A remote op that arrived while a local drag owned the node — applied on end if the local
   * gesture produced no commit, so a suppressed remote value isn't lost. */
  pending_remote: DragOp | null;
  /** The offset captured at drag-start — `end` only commits when the offset actually changed. */
  readonly start_offset: Point;
  /** Registered drag handles / cancel zones (node → priority). The start-gate walks the pointer's
   * `composedPath` against these: the innermost registered marker wins (priority overrides the
   * nesting), `handle` ⇒ allow, `cancel` ⇒ block. Empty `handles` ⇒ the whole node drags. */
  readonly handles: Map<DndNode, number>;
  readonly cancels: Map<DndNode, number>;
  constructor(node: DndNode, options: DragOptions);
  get targetId(): string;
  get hasExplicitId(): boolean;
  event(input: InteractionInput): DragEventData;
}
/** In-flight drag presence — the `drag` variant of the unified presence frame. */
type DragPresence = {
  type: 'drag';
  target: string;
  x: number;
  y: number;
};
/** Handle returned from `Drag.bind` — fine-grained `update()` + `destroy()`. */
declare class DragHandle {
  #private;
  constructor(drag: Drag, state: DragState);
  /** Targeted, fine-grained update — only the provided keys are written. */
  update(options: Partial<DragOptions>): void;
  /**
   * Register a descendant as a drag **handle** — once any handle exists, a drag may start only from
   * inside one. `priority` overrides the innermost-wins nesting cascade when zones overlap on the
   * pointer's path. Returns an idempotent disposer that unregisters only this node.
   */
  registerHandle(node: DndNode, opts?: {
    priority?: number;
  }): () => void;
  /**
   * Register a descendant as a **cancel** zone — a drag may never start from inside it. `priority`
   * overrides the nesting cascade. Returns an idempotent disposer that unregisters only this node.
   */
  registerCancel(node: DndNode, opts?: {
    priority?: number;
  }): () => void;
  get offset(): Point;
  get isDragging(): boolean;
  /** The draggable's stable string id — the `target` in the unified op grammar. */
  get targetId(): string;
  /** Whether `targetId` came from an explicit `id` option (auto ids are peer-local). */
  get hasExplicitId(): boolean;
  onCommit(fn: (op: CollabOp) => void): () => void;
  onPresence(fn: (p: LocalPresence | null) => void): () => void;
  /** Apply a remote drag fact — translates the node to the committed offset (eased). Foreign kinds
   * ignored — this is the unified `CollabTarget.applyExternal`. */
  applyExternal(op: CollabOp): void;
  showRemotePresence(frame: PresenceFrame): void;
  clearRemotePresence(peerId?: string): void;
  destroy(): void;
}
/**
 * The drag capability. Options-only: the common constraints are inlined pure transforms
 * (no plugin objects). Owns its own node registry and claims pointerdowns that land on a
 * bound node (respecting handle/cancel/disabled).
 */
declare class Drag implements Capability {
  #private;
  readonly key: symbol;
  readonly name = "drag";
  readonly priority = 0;
  bind(node: DndNode, options?: DragOptions): DragHandle;
  /** @internal */
  _unbind(node: DndNode): void;
  resolve(input: InteractionInput): ResolvedTarget | null;
  shouldStart(session: InteractionSession): boolean;
  start(session: InteractionSession): void;
  move(session: InteractionSession): void;
  end(session: InteractionSession, _reason: EndReason): void;
  /** Apply a remote drag fact — translate to the committed offset, eased. A no-op while a local drag
   *  owns the node (stashed, applied on end if the local gesture commits nothing). */
  applyExternal(state: DragState, op: DragOp): void;
  showRemotePresence(state: DragState, frame: DragPresence & {
    peerId: string;
  }): void;
  clearRemotePresence(state: DragState, peerId?: string): void;
}
//#endregion
export { dragAnchor as _, Drag as a, DragOptions as c, Point as d, RectLike as f, constrainGrid as g, constrainBounds as h, BoundsTarget as i, DragPlugin as l, constrainAxis as m, BoundsInput as n, DragEventData as o, constrain as p, BoundsPadding as r, DragHandle as s, Axis as t, DragState as u, proposedOffset as v };