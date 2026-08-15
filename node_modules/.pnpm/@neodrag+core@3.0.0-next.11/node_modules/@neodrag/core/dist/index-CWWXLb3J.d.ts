import { i as LocalPresence, n as CollabTarget, o as PresenceFrame, t as CollabOp } from "./collab-types-Y3M0X2KT.js";
import { a as Capability, c as InteractionSession, d as InteractionInput, o as DndNode, s as EndReason, u as ResolvedTarget } from "./types-G2NWiUm6.js";
import { d as Point, f as RectLike } from "./drag-CL5U3tM0.js";

//#region src/drop/drop.d.ts
/**
 * Collision ranking policies. `'pointer'` and `'closestCenter'` are the originals ported from
 * `drop-targets.ts`. `'closestEdge'` and `'intersection'` are the richer strategies the deep-drop
 * port adds — `closestEdge` ranks by distance to the nearest rect edge (good for list inserts),
 * `intersection` ranks by overlap area with a probe rect (the dragged element), so the zone the
 * dragged element *covers most* wins. All four tie-break only when at least one candidate opts in.
 */
type CollisionPolicy = 'pointer' | 'closestCenter' | 'closestEdge' | 'intersection';
/**
 * The v1 collision seam. Drop hit-testing flows through a pluggable index so the
 * spatial-index moonshot (quad-tree/R-tree) and off-DOM geometry backends (virtual/canvas)
 * drop in without touching the drop capability. Default impl is a trivial linear scan.
 */
interface CollisionIndex<T> {
  insert(id: T, rect: RectLike): void;
  update(id: T, rect: RectLike): void;
  remove(id: T): void;
  clear(): void;
  /** Ids whose rect contains the point. */
  query(x: number, y: number): T[];
}
declare class LinearCollisionIndex<T> implements CollisionIndex<T> {
  #private;
  insert(id: T, rect: RectLike): void;
  update(id: T, rect: RectLike): void;
  remove(id: T): void;
  clear(): void;
  query(x: number, y: number): T[];
}
declare function centerDistanceSq(r: RectLike, x: number, y: number): number;
/** Squared distance from a point to the nearest edge of `r` (0 when the point is inside). */
declare function edgeDistanceSq(r: RectLike, x: number, y: number): number;
/** Overlap area (px²) between two rects; 0 when disjoint. Used by the `'intersection'` policy. */
declare function intersectionArea(a: RectLike, b: RectLike): number;
interface RankCandidate {
  rect: RectLike;
  priority: number;
  policy: CollisionPolicy;
}
/** Probe geometry for richer strategies: the dragged element's current rect (for `intersection`). */
interface RankContext {
  probeRect?: RectLike | null;
}
/**
 * The single ranking function (replaces the duplicate logic the teardown found in
 * `drop-targets.ts` and `interaction-coordinator.ts`). Highest priority wins; ties are
 * broken by the strategy either candidate prefers (closest-center / closest-edge / max
 * intersection-area). `ctx.probeRect` is the dragged element's rect for the area strategy.
 */
declare function rankDrop<T extends RankCandidate>(candidates: T[], x: number, y: number, ctx?: RankContext): T | null;
/**
 * Multi-sample hit-testing presets. The original `drop-targets.ts` only ever hit-tested the
 * bare pointer (one point), which means a zone is "entered" only when the *cursor* crosses it —
 * a large dragged element can visually overlap a zone with its edge while the cursor is still
 * outside. Multi-sampling fixes that: we hit-test several points of the dragged element's rect,
 * not just the pointer, so a zone counts as hit when *any* sampled point lands inside it.
 *
 *  - `'pointer'`  : just the pointer (legacy behaviour, cheapest).
 *  - `'corners'`  : pointer + the 4 rect corners (edge overlap is detected).
 *  - `'edges'`    : pointer + 4 corners + 4 edge midpoints (denser; thin zones between corners).
 *  - `'center'`   : pointer + rect center (intent-following without edge bleed).
 *  - `'all'`      : pointer + corners + edge midpoints + center (densest).
 */
type DropSampleMode = 'pointer' | 'corners' | 'edges' | 'center' | 'all';
/**
 * A sampler turns a pointer position + the dragged element's current rect into the set of points
 * to hit-test this frame. This is the `dropPointerSamples` seam ported from the original engine
 * extension hook (`extension-registry.ts`), now a first-class drop option. Custom samplers (e.g.
 * "follow the leading edge in the drag direction") plug in by passing a function.
 */
type DropSampler = (ctx: {
  pointer: Point;
  rect: RectLike | null;
}) => Point[];
/** Resolve the `dropPointerSamples` option (mode preset OR custom sampler) to a sampler fn. */
declare function resolveSampler(mode: DropSampleMode | DropSampler | undefined): DropSampler;
/**
 * rAF coalescer ported from `drop-targets.ts` (`queueUpdate`/`flush`/`reset`). Pointer moves can
 * fire many times per frame (high-Hz mice, coalesced native events). Hit-testing every move is
 * wasteful — the geometry only matters once per paint. This batches: any number of `schedule()`
 * calls inside one frame collapse to a single `run` callback at the next animation frame, and the
 * latest value wins. `flush()` runs synchronously (for the drop commit on pointerup), cancelling
 * any pending frame so we never double-run.
 */
declare class RafBatch<T> {
  #private;
  constructor(run: (value: T) => void);
  /** True while a frame is queued but not yet fired. */
  get scheduled(): boolean;
  /** Coalesce: store the latest value, schedule one frame if none is pending. */
  schedule(value: T): void;
  /** Run synchronously now (drop/end path), cancelling any pending frame. */
  flush(value: T): void;
  /** Cancel a pending frame and drop the stored value without running. */
  cancel(): void;
}
interface VirtualCollisionOptions<T> {
  /**
   * The virtualizer's on-screen set — the ids whose rects are currently rendered/visible.
   * When supplied, `query` only hit-tests these ids, so cost is O(visible) regardless of how
   * many rects are stored. Off-screen rects are kept (for cheap update/insert as items scroll
   * into view) but never matched.
   */
  visible?: () => Iterable<T>;
}
/**
 * The flagship perf arena's drop-in for the {@link CollisionIndex} seam. Stores rects in a Map
 * exactly like `LinearCollisionIndex`, but when a `visible()` provider is given the query phase
 * iterates only the virtualizer's on-screen ids — turning a 100k-item drop/sortable hit-test
 * into an O(visible) scan. Without the option it degrades to plain linear behavior.
 */
declare class VirtualCollisionIndex<T> implements CollisionIndex<T> {
  #private;
  constructor(options?: VirtualCollisionOptions<T>);
  insert(id: T, rect: RectLike): void;
  update(id: T, rect: RectLike): void;
  remove(id: T): void;
  clear(): void;
  query(x: number, y: number): T[];
}
interface DropEventData {
  zone: DndNode;
  /** The dragged element for an in-app drag; `null` for an OS (native) file/text drop. */
  dragNode: DndNode | null;
  data: unknown;
  input: InteractionInput;
  /** OS-dropped files — populated only on `onDrop` of a native drop (empty otherwise). */
  files?: File[];
  /** OS-dropped text — populated only on `onDrop` of a native drop. */
  text?: string;
}
/** What `accepts` receives. `dragNode`/`data` are null for a native drop; `types` lists the OS
 * payload kinds (e.g. `'Files'`, `'text/plain'`), available throughout a native drag. */
interface DropAcceptCtx {
  dragNode: DndNode | null;
  data: unknown;
  files?: File[];
  text?: string;
  types?: readonly string[];
}
interface DropOptions {
  /** Filter which drags this zone accepts. Receives the drag node + its `dragData` (or the native
   * payload kinds). */
  accepts?: (ctx: DropAcceptCtx) => boolean;
  collision?: CollisionPolicy;
  priority?: number;
  /** Grow the hit rect by N px on each side. */
  hitExpand?: number;
  /** When true, the zone is skipped during hit-testing — no enter/over/leave/drop. */
  disabled?: boolean;
  /** Opt this zone into OS drag-and-drop (files / selected text). Arms the native sensor on the
   * shared engine; the drop arrives through `onDrop` with `e.files` / `e.text`. */
  native?: boolean;
  /**
   * Stable string id for this zone — the `target` in the unified collab op grammar. A drop has no
   * replayable op (its outcome is an app side-effect), but a zone *does* carry remote-hover presence;
   * the id must match across peers for that to route. An auto id is peer-local.
   */
  id?: string;
  onEnter?: (e: DropEventData) => void;
  onOver?: (e: DropEventData) => void;
  onLeave?: (e: DropEventData) => void;
  onDrop?: (e: DropEventData) => void;
}
/** Engine-wide drop knobs (one per `Drop` capability, not per zone). */
interface DropEngineOptions {
  /**
   * Multi-sample hit-testing (ported from the original `dropPointerSamples` extension hook).
   * Hit-test several points of the dragged element's rect instead of only the pointer, so a
   * zone is entered when the element's *edge* overlaps even if the cursor doesn't. A preset
   * mode string or a custom sampler. Default `'pointer'` (legacy single-point behaviour).
   */
  dropPointerSamples?: DropSampleMode | DropSampler;
  /**
   * Coalesce per-move hit-tests into one per animation frame (ported from `drop-targets.ts`).
   * N pointer moves inside one frame → one hit-test, with a synchronous flush on drop. Default
   * `false` (hit-test synchronously on every move). Opt in for high-Hz pointers / large zone
   * counts where per-move hit-testing is the bottleneck.
   */
  coalesce?: boolean;
  /** Swap in an off-DOM / spatial-index backend for the {@link CollisionIndex} seam. */
  index?: () => CollisionIndex<DropState>;
}
/** Set on a zone (value = peer id) while a remote peer is hovering it. */
declare const REMOTE_HOVER_ATTR = "data-neodrag-remote-hover";
/** Marks the floating cursor dot rendered for a remote peer's hover (value = peer id). */
declare const REMOTE_HOVER_MARKER_ATTR = "data-neodrag-remote-hover-marker";
/** In-flight drop-hover presence — the `drop-hover` variant of the unified presence frame. */
type DropHoverPresence = Extract<LocalPresence, {
  type: 'drop-hover';
}>;
declare class DropState {
  readonly node: DndNode;
  options: DropOptions;
  isOver: boolean;
  /** Rect cached at drag-start (invalidated on scroll/resize) — avoids a reflow per move. */
  rect: RectLike | null;
  /** Auto target id — peer-local; `targetId` prefers `options.id`. */
  readonly auto_target_id: string;
  readonly presence_subscribers: Set<(p: LocalPresence | null) => void>;
  /** Remote peers' hover cursor markers, keyed by peer id. */
  readonly remote_hovers: Map<string, HTMLElement>;
  constructor(node: DndNode, options: DropOptions);
  get targetId(): string;
  get hasExplicitId(): boolean;
}
declare class DropHandle {
  #private;
  constructor(drop: Drop, state: DropState);
  update(options: Partial<DropOptions>): void;
  /** The zone's stable string id — the `target` in the unified op grammar. */
  get targetId(): string;
  /** Whether `targetId` came from an explicit `id` option (auto ids are peer-local). */
  get hasExplicitId(): boolean;
  /** A drop has no replayable op — `onCommit` exists to satisfy {@link CollabTarget} but never fires. */
  onCommit(_fn: (op: CollabOp) => void): () => void;
  onPresence(fn: (p: LocalPresence | null) => void): () => void;
  /** No replayable drop op — a no-op (satisfies {@link CollabTarget}). */
  applyExternal(_op: CollabOp): void;
  /** Render a remote peer hovering this zone — mark the zone + drop a floating cursor dot. */
  showRemotePresence(frame: PresenceFrame): void;
  clearRemotePresence(peerId?: string): void;
  destroy(): void;
}
/**
 * The drop capability. Never claims a pointerdown — it *observes* drag sessions (via the
 * engine's observer hook) and hit-tests registered zones through the pluggable
 * `CollisionIndex`. Collision/priority/hit-expand are immutable options, not plugins.
 */
declare class Drop implements Capability {
  #private;
  readonly key: symbol;
  readonly name = "drop";
  constructor(options?: DropEngineOptions);
  /** @internal Count of hit-tests run — lets tests assert N moves coalesce to one. */
  get hitCount(): number;
  /** @internal True while a coalesced hit-test frame is queued. */
  get pendingFrame(): boolean;
  bind(node: DndNode, options?: DropOptions): DropHandle;
  /** @internal */
  _unbind(node: DndNode): void;
  resolve(): ResolvedTarget | null;
  start(): void;
  move(): void;
  end(): void;
  observe(session: InteractionSession, phase: 'start' | 'move' | 'end', _reason?: EndReason): void;
  /** Render a remote peer hovering `state`'s zone — mark the zone + a floating cursor dot. @internal */
  showRemotePresence(state: DropState, frame: DropHoverPresence & {
    peerId: string;
  }): void;
  /** Clear a remote peer's hover from `state`'s zone (or all peers when none is given). @internal */
  clearRemotePresence(state: DropState, peerId?: string): void;
}
//#endregion
//#region src/drop/droppable.d.ts
/**
 * Ergonomic single-element drop zone: `new Droppable(node, options)`. Shares the engine
 * with `Draggable`, so it automatically observes drag sessions. Satisfies the unified
 * {@link CollabTarget} seam (drop carries remote-hover presence, no replayable op), so
 * `room.add(droppable)` works.
 */
declare class Droppable implements CollabTarget {
  #private;
  constructor(node: DndNode, options?: DropOptions);
  update(options: Partial<DropOptions>): void;
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
//#region src/drop/native-drag.d.ts
declare const NATIVE_DRAG_KEY: unique symbol;
/**
 * Session-host for OS drag-and-drop. It claims the `native-dnd` input stream — at the highest
 * priority, so it wins the engine's resolve race over drag/sortable/resize, which would otherwise
 * try to claim whatever element the file is dragged over — and does nothing else. `Drop` observes
 * the resulting session and handles the zones, exactly as it does for a pointer drag.
 */
declare class NativeDrag implements Capability {
  readonly key: symbol;
  readonly name = "native-drag";
  readonly priority = 1000000;
  resolve(input: InteractionInput): ResolvedTarget | null;
  start(_session: InteractionSession): void;
  move(_session: InteractionSession): void;
  end(_session: InteractionSession): void;
}
/** Idempotently arm native file/text DnD on the shared engine (session host + sensor). Called by
 * the ergonomic `Droppable` when a zone opts in with `native: true`. */
declare function enableNativeDnd(): void;
//#endregion
export { VirtualCollisionIndex as C, intersectionArea as D, edgeDistanceSq as E, rankDrop as O, RankContext as S, centerDistanceSq as T, LinearCollisionIndex as _, CollisionIndex as a, RafBatch as b, DropAcceptCtx as c, DropHandle as d, DropHoverPresence as f, DropState as g, DropSampler as h, Droppable as i, resolveSampler as k, DropEngineOptions as l, DropSampleMode as m, NativeDrag as n, CollisionPolicy as o, DropOptions as p, enableNativeDnd as r, Drop as s, NATIVE_DRAG_KEY as t, DropEventData as u, REMOTE_HOVER_ATTR as v, VirtualCollisionOptions as w, RankCandidate as x, REMOTE_HOVER_MARKER_ATTR as y };