import { a as Mirror, i as LocalPresence, l as SortableOp, n as CollabTarget, o as PresenceFrame, t as CollabOp } from "./collab-types-Y3M0X2KT.js";
import { a as Capability, c as InteractionSession, d as InteractionInput, s as EndReason, u as ResolvedTarget } from "./types-G2NWiUm6.js";

//#region src/sortable/sortable.d.ts
/**
 * The CRDT-ready commit core of sortable. Reorders are expressed as **anchor-based move
 * ops** (`{ itemId, afterId }`) rather than integer-index splices — concurrency-safe (an
 * anchor survives concurrent inserts/deletes where an index doesn't) and the exact shape an
 * `@neodrag/collab` adapter maps onto Loro's movable list / Yjs / a server. Pure + testable.
 */
interface MoveOp {
  itemId: string;
  /** Insert immediately after this id. `null` = move to the front. */
  afterId: string | null;
}
/**
 * The stable key for an item. Any value works — there is no `keyOf` option:
 *
 * - an object with an `id` or `key` field → that field (stringified);
 * - any other object → a per-reference identity key (stable while the reference is reused);
 * - a primitive (string/number/…) → the value itself, stringified.
 *
 * Identity keys are session-local, so for collaboration or persisted order give items a real
 * `id`/`key`; for a local list with stable object references, passing the object alone is enough.
 */
declare function sortableKey<T>(item: T): string;
/** Apply an anchor-based move op to an ordered list, returning the new order. */
declare function applyMove<T>(items: readonly T[], op: MoveOp): T[];
/**
 * Build the anchor op for moving the item currently at `from` so it lands at index `to`
 * in the resulting order. The anchor is the key that ends up immediately before it (or
 * null for the front) — derived from the order with the moved item removed.
 */
declare function moveOpFromIndices(keys: readonly string[], from: number, to: number): MoveOp;
/** Convenience: produce the new key order for a from→to index move. */
declare function reorderKeys(keys: readonly string[], from: number, to: number): string[];
type SortAxis = 'x' | 'y';
/** A measured item: its key, sorted center along the active axis, and its list index. */
interface MidEntry {
  key: string;
  mid: number;
  index: number;
}
interface ItemRect {
  key: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}
/** Build axis-sorted midpoints from variable-sized measured rects. */
declare function buildMids(rects: readonly ItemRect[], axis: SortAxis): MidEntry[];
/** Slot boundaries are the half-points between consecutive midpoints. */
declare function slotBoundariesFromMids(mids: readonly MidEntry[]): number[];
interface TargetFromMidsOptions {
  /** Skip the "pointer still over the dragged item's own footprint" dead-zone. */
  skipDragDeadZone?: boolean;
  /** The dragged item's footprint [start,end] along the axis (for the dead-zone). */
  dragFootprint?: {
    start: number;
    end: number;
  } | null;
  /** Symmetric px band added/subtracted from a mid before a flip counts. */
  edgeThresholdPx?: number;
}
/**
 * Resolve the insert index for `pos` (pointer position along the active axis) given the
 * measured mids. `excludeKey` is the dragged item (it doesn't count toward its own insert
 * slot). The insert index is the count of *other* items whose real midpoint the pointer has
 * passed — variable sizes are honoured because each `mid` is the item's measured center, so
 * a tall item claims a wider slot than a short one. `edgeThresholdPx` widens each midpoint
 * into a band before a crossing counts (a global dead-zone around every boundary).
 *
 * The returned index is in "insert-after-removal" space, matching `moveOpFromIndices`: it
 * is the position the dragged item lands at once it has been pulled out of the list.
 */
declare function computeTargetFromMids(mids: readonly MidEntry[], pos: number, excludeKey: string, len: number, options?: TargetFromMidsOptions): number;
/**
 * Hysteresis gate (single-list). A candidate index that is exactly one slot away from the
 * current one is only accepted once the pointer has crossed the boundary by `band` px.
 * Ported verbatim from `stabilizeVisualInsertAt`.
 */
declare function stabilizeInsertAt(current: number, candidate: number, pos: number, boundaries: readonly number[], band: number): number;
/**
 * Hysteresis gate for foreign (cross-container) inserts where there is no dragged item in
 * the list to anchor against. Ported from `stabilizeForeignInsertAt`.
 */
declare function stabilizeForeignInsertAt(current: number, candidate: number, pos: number, mids: readonly MidEntry[], band: number): number;
type GridCollision = 'closestCenter' | 'pointerWithin';
/**
 * Resolve the index the pointer is currently over in a grid. With `pointerWithin` an item
 * the pointer is literally inside wins; otherwise (and as the fallback) the nearest center
 * by squared distance wins. Ported from `computeGridOverIndex`.
 */
declare function computeGridOverIndex(rects: readonly ItemRect[], pointerX: number, pointerY: number, collision?: GridCollision): number;
/**
 * The (dx, dy) every non-dragged item between `from` and `to` should be shifted by so the
 * grid opens a gap at `to` and closes the one at `from`. Each in-between item slides into
 * the slot of its neighbour (toward the drag origin), which is the rect difference — this
 * is what makes wrapped rows animate correctly instead of overshooting.
 *
 * Ported from the index-range logic in `rectSortingStrategy`: items `(from, to]` shift one
 * slot back when moving forward; items `[to, from)` shift one slot forward when moving back.
 */
declare function gridDisplacements(rects: readonly ItemRect[], from: number, to: number): Map<number, {
  x: number;
  y: number;
}>;
declare const FLIP_MOVE_THRESHOLD_PX = 2;
/** Snapshot the current viewport rect of each node (the "First" of FLIP). */
declare function recordFlipRects(nodes: Iterable<HTMLElement>): Map<HTMLElement, DOMRect>;
/**
 * Invert + play. For each node, compare its current ("Last") rect to the captured
 * ("First") rect, apply the inverse transform, then animate it back to identity. Sub-2px
 * moves are skipped (noise). Resolves once every animation has settled. A zero/negative
 * duration is treated as "no animation" and resolves immediately.
 */
declare function playFlip(nodes: Iterable<HTMLElement>, before: Map<HTMLElement, DOMRect>, duration: number): Promise<void>;
/**
 * Animate a single (typically the just-dropped) node from its current viewport position to
 * a target translate offset, returning to identity. Used to glide the lifted chip into its
 * resting slot on release. Resolves when the animation settles.
 */
declare function animateToOffset(node: HTMLElement, dx: number, dy: number, duration: number): Promise<void>;
/** Resolve the configured animation duration (ms) from the `boolean | number` option. */
declare function resolveAnimationDuration(animation: boolean | number | undefined): number;
declare const SORTABLE_LIFTED_ATTR = "data-neodrag-sortable-lifted";
/** The captured pre-lift inline styles, restored on release. */
interface LiftState {
  position: string;
  left: string;
  top: string;
  width: string;
  height: string;
  margin: string;
  zIndex: string;
  translate: string;
  placeholder: {
    node: HTMLElement;
    minWidth: string;
    minHeight: string;
    flexShrink: string;
  } | null;
}
/** Convert a viewport rect to coordinates local to the fixed containing block. */
declare function fixedLocalCoords(node: HTMLElement, rect: DOMRect): {
  left: number;
  top: number;
};
/**
 * Lift `node`: snapshot its rect, insert a placeholder in its slot to reserve the space,
 * then pin the node to `fixed` at its current visual position. Returns the captured state
 * for `release`.
 */
declare function liftNode(node: HTMLElement): LiftState;
/** Move a lifted node to follow the pointer (raw viewport delta from the lift origin). */
declare function moveLiftedNode(node: HTMLElement, dx: number, dy: number): void;
/** Restore the lifted node back into the flow and remove the placeholder. */
declare function releaseNode(node: HTMLElement, state: LiftState): void;
/** Measure where the lifted node *would* sit in the flow (the placeholder's slot). */
declare function placeholderRect(state: LiftState): DOMRect | null;
/** A container registered for cross-container transfer, addressed by identity. */
interface TransferContainer {
  readonly id: symbol;
  readonly group: string | undefined;
  readonly node: HTMLElement;
  readonly axis: SortAxis;
  /** Measured item rects (sorted by list order) for the *current* contents (cached per drag). */
  rects(): ItemRect[];
  /** The container's own rect (cached per drag; invalidated on scroll/resize). */
  rect(): TransferRectLike;
  /** Whether this container will accept `item` transferring in from `from_node`. */
  accepts(item: unknown, from_node: HTMLElement): boolean;
}
/** The committed cross-container move. Mirrors the original GroupDropPlan 'transfer' kind. */
interface TransferOp<T = unknown> {
  item: T;
  fromContainer: symbol;
  toContainer: symbol;
  from: number;
  to: number;
}
type TransferRectLike = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'>;
/**
 * Score how well `target` aligns with the pointer / dragged chip. Lower is better; null
 * means out of range. Ported from `scoreForeignTargetProximity`.
 */
declare function scoreTarget(target: TransferContainer, pointerX: number, pointerY: number, dragCenterX: number, dragCenterY: number, proximityPx: number): number | null;
/**
 * Registry of grouped containers. The source consults it during a drag. Keyed by identity
 * so two `SortableList`s in the same `group` find each other without any wiring.
 */
declare class TransferRegistry {
  #private;
  register(c: TransferContainer): void;
  unregister(id: symbol): void;
  get(id: symbol): TransferContainer | undefined;
  /**
   * Best foreign container for the pointer, or null. Skips the source and any container in
   * a different group. Ported from `pickBestForeignTarget`.
   */
  pickBestForeignTarget(source: TransferContainer, pointerX: number, pointerY: number, dragCenterX: number, dragCenterY: number, proximityPx: number, accept?: (c: TransferContainer) => boolean): TransferContainer | null;
  /** Plain pointer-inside-container hit, used as the sticky-target fallback. */
  findByContainerPointer(source: TransferContainer, px: number, py: number, accept?: (c: TransferContainer) => boolean): TransferContainer | null;
}
/**
 * Resolve the insert index into a foreign target. Appends past the content end edge along
 * the approach axis; otherwise the nearest midpoint crossing. Ported from
 * `resolveForeignInsertAt` / `foreignColumnShouldAppendAtEnd`.
 */
declare function resolveForeignInsertAt(target: TransferContainer, pointerX: number, pointerY: number): number;
/** Holds the in-flight transfer target between moves (sticky). */
interface TransferState {
  stickyTargetId: symbol | null;
}
declare function createTransferState(): TransferState;
/**
 * Resolve the transfer target for this move with sticky-hold semantics. The best proximity
 * winner is preferred; failing that the pointer-in-container hit; failing that the
 * remembered sticky target if the pointer is still inside it. Ported from
 * `resolveTransferTarget`.
 */
declare function resolveTransferTarget(registry: TransferRegistry, state: TransferState, source: TransferContainer, pointerX: number, pointerY: number, dragCenterX: number, dragCenterY: number, proximityPx: number, accept?: (c: TransferContainer) => boolean): TransferContainer | null;
/**
 * Sortable DOM state-attribute convention — the contract a host stylesheet can hook. The engine
 * is the only writer of these; nothing else should set them:
 * - `data-neodrag-sortable-key`                     — per row, the item's stable key (set via `row()`).
 * - `data-neodrag-sortable-dragging`        — on the row currently being dragged.
 * - `data-neodrag-sortable-elevated-source` — on the source list during a grouped (cross-container)
 *                                             drag, so it stacks above sibling lists.
 * - `data-neodrag-sortable-indicator`       — on the engine-drawn drop-line in `indicator: 'line'`.
 * - `data-neodrag-sortable-ghost`           — on the dimmed origin placeholder in `indicator: 'line'`.
 */
declare const SORTABLE_KEY_ATTR = "data-neodrag-sortable-key";
type SortStrategy = 'list' | 'grid';
interface SortableOptions<T = unknown> {
  /**
   * Current ordered items (the framework re-pushes a snapshot on change). Each item's key is its
   * `id`/`key` field, or the item itself for primitives — see {@link sortableKey}.
   */
  items: T[];
  /** Anchor-based move op + the convenient reordered array. */
  onReorder: (next: T[], op: MoveOp) => void;
  /**
   * Stable string id for this list — the `target` in the unified collab op grammar (it must match
   * across collaborating peers). An auto id is peer-local.
   */
  id?: string;
  /** Pure op stream — what `@neodrag/collab` subscribes to (durable, fires on every commit). */
  onCommit?: (op: MoveOp) => void;
  /** Cross-container move — fires on the *target* container when an item transfers in. */
  onTransfer?: (op: TransferOp<T>) => void;
  axis?: SortAxis;
  /** `list` (1D midpoint crossing) or `grid` (2D closest-center). Default `list`. */
  strategy?: SortStrategy;
  /**
   * Preview style. `push` (default) opens a gap by displacing siblings. `line` leaves every item
   * in place, dims a **ghost** at the origin, lets the item drag freely, and draws an engine-owned
   * drop-line (`[data-neodrag-sortable-indicator]`) at the insertion point. The committed reorder
   * is identical — only the preview differs. Works for list, grid, and cross-container.
   */
  indicator?: 'push' | 'line';
  /** Cross-container transfer group. Containers sharing a group can exchange items. */
  group?: string;
  /**
   * Vet an item transferring **into** this list from another container. Return `false` to reject
   * it: the zone won't open a preview gap, won't accept the drop, and the chip returns to its
   * source. The item itself drives the rule — read its `type`/tags/data. Consulted only for
   * cross-container transfer; same-list reordering is never filtered. Default: accept all.
   */
  accepts?: (item: T, info: {
    from: HTMLElement;
    to: HTMLElement;
  }) => boolean;
  /**
   * FLIP on reorder/commit. `true` → 200ms, a number → that many ms, `false` → off.
   * Default `true`.
   */
  animation?: boolean | number;
  /** Lift the dragged node onto `position:fixed` so it floats above siblings. Default off. */
  lift?: boolean;
  /** Proximity band (px) within which a foreign column is eligible. Default auto. */
  foreignProximity?: number;
  /**
   * Anti-flap band (px) the pointer must cross *past* a slot boundary before the gap flips
   * to the neighbouring slot. Stops the index oscillating when the pointer hovers exactly
   * on a boundary. Default 3.
   */
  hysteresis?: number;
  /** When true, the list ignores pointerdowns — no reorder starts. */
  disabled?: boolean;
}
/** Ephemeral in-flight presence — broadcast by `@neodrag/collab`, never persisted. */
interface SortablePresence {
  dragKey: string;
  fromIndex: number;
  toIndex: number;
}
declare class SortableContext<T = unknown> {
  readonly container: HTMLElement;
  options: SortableOptions<T>;
  readonly id: symbol;
  /** Auto target id — peer-local; `targetId` prefers `options.id`. */
  readonly auto_target_id: string;
  readonly commit_subscribers: Set<(op: SortableOp) => void>;
  readonly presence_subscribers: Set<(p: LocalPresence | null) => void>;
  /** Remote peers' rendered ghost placeholders, keyed by peer id. */
  readonly remote_ghosts: Map<string, HTMLElement>;
  constructor(container: HTMLElement, options: SortableOptions<T>);
  get axis(): SortAxis;
  get strategy(): SortStrategy;
  get targetId(): string;
  get hasExplicitId(): boolean;
  /** The current key order of this list. */
  keys(): string[];
}
declare class SortableHandle<T = unknown> {
  #private;
  constructor(cap: Sortable, ctx: SortableContext<T>);
  update(options: Partial<SortableOptions<T>>): void;
  /** The list's stable string id — the `target` in the unified op grammar. */
  get targetId(): string;
  /** Whether `targetId` came from an explicit `id` option (auto ids are peer-local). */
  get hasExplicitId(): boolean;
  /** The current key order — the Room seeds its reconciler from it. */
  keys(): string[];
  onCommit(fn: (op: CollabOp) => void): () => void;
  onPresence(fn: (p: LocalPresence | null) => void): () => void;
  /**
   * Apply a remote fact through the same reorder path. Accepts a wire op (`{type:'move'|'transfer',
   * target, …}`) from the Room, or — legacy — a bare anchor {@link MoveOp}. Foreign op kinds no-op.
   */
  applyExternal(op: MoveOp | CollabOp): void;
  /** Render a remote peer's in-flight reorder as a ghost placeholder. Foreign kinds no-op. */
  showRemotePresence(frame: PresenceFrame, opts?: {
    mirror?: unknown;
  }): void;
  clearRemotePresence(peer_id?: string, opts?: {
    ease?: boolean;
  }): void;
  /** Current in-flight reorder presence, or null. */
  presence(): SortablePresence | null;
  destroy(): void;
}
/**
 * The sortable capability. Deep pipeline: measure (variable sizes) → resolve insert
 * (anchor, with hysteresis) → project displacement (1D list shift or 2D grid shift) →
 * commit (FLIP). Optionally lifts the dragged node to `fixed`. Grouped containers exchange
 * items via the cross-container transfer registry, firing `onTransfer` on the target.
 */
declare class Sortable implements Capability {
  #private;
  readonly key: symbol;
  readonly name = "sortable";
  readonly priority = 0;
  bind<T>(container: HTMLElement, options: SortableOptions<T>): SortableHandle<T>;
  /** @internal */
  _unbind(ctx: SortableContext): void;
  resolve(input: InteractionInput): ResolvedTarget | null;
  start(session: InteractionSession): void;
  move(session: InteractionSession): void;
  end(session: InteractionSession, reason: EndReason): void;
  /** Presence snapshot of an in-flight reorder for `ctx` (CRDT-ready hook, inert if unused). */
  presenceFor(ctx: SortableContext): SortablePresence | null;
  /** Apply a remote wire op (`move`/`transfer`) through the same reorder paths a local commit uses.
   *  Foreign op kinds (drag/resize/rotate) no-op. @internal */
  applyExternalOp(ctx: SortableContext, op: CollabOp): void;
  /** Render a remote peer's in-flight reorder as a ghost placeholder at its insert slot. @internal */
  showRemotePresence(ctx: SortableContext, frame: Extract<PresenceFrame, {
    type: 'sortable';
  }>, _opts?: {
    mirror?: unknown;
  }): void;
  /** Remove a remote peer's ghost (or all ghosts when no peer id is given). @internal */
  clearRemotePresence(ctx: SortableContext, peer_id?: string, _opts?: {
    ease?: boolean;
  }): void;
}
//#endregion
//#region src/sortable/sortable-list.d.ts
/** The attribute binding produced by `SortableList.row(item)` — spread onto a row element. */
type SortableRow = {
  readonly [SORTABLE_KEY_ATTR]: string;
};
/** Ergonomic per-container class: `new SortableList(container, options)`. Satisfies the unified
 *  {@link CollabTarget} seam, so `room.add(list)` works. */
declare class SortableList<T = unknown> implements CollabTarget {
  #private;
  constructor(container: HTMLElement, options: SortableOptions<T>);
  /**
   * The per-row binding — spread it onto each item element instead of hand-writing the
   * `data-neodrag-sortable-key` attribute: `<li {...list.row(item)}>`. Pass the ITEM; its key is derived
   * via {@link sortableKey} (its `id`/`key`, or the item itself for primitives).
   */
  row(item: T): SortableRow;
  /**
   * Imperatively register a row element under a stable string key — stamps the sortable-key
   * attribute and returns a teardown that removes it. For framework wrappers whose row binding is
   * an attachment/directive (`{...list.row(id)}`) rather than a static attribute.
   */
  registerRow(node: HTMLElement, key: string): () => void;
  update(options: Partial<SortableOptions<T>>): void;
  /** Current in-flight reorder presence (drag key + from/to index), or null. */
  presence(): SortablePresence | null;
  get targetId(): string;
  get hasExplicitId(): boolean;
  /** Current key order — the Room seeds its reconciler from this. */
  keys(): string[];
  onCommit(fn: (op: CollabOp) => void): () => void;
  onPresence(fn: (p: LocalPresence | null) => void): () => void;
  /** Apply a remote reorder/transfer fact through the same reorder path a local commit uses. */
  applyExternal(op: CollabOp): void;
  showRemotePresence(frame: PresenceFrame, opts?: {
    mirror?: Mirror;
  }): void;
  clearRemotePresence(peer_id?: string, opts?: {
    ease?: boolean;
  }): void;
  destroy(): void;
}
//#endregion
export { gridDisplacements as A, resolveForeignInsertAt as B, animateToOffset as C, computeTargetFromMids as D, computeGridOverIndex as E, playFlip as F, stabilizeForeignInsertAt as G, scoreTarget as H, recordFlipRects as I, stabilizeInsertAt as K, releaseNode as L, moveLiftedNode as M, moveOpFromIndices as N, createTransferState as O, placeholderRect as P, reorderKeys as R, TransferState as S, buildMids as T, slotBoundariesFromMids as U, resolveTransferTarget as V, sortableKey as W, SortablePresence as _, ItemRect as a, TransferOp as b, MoveOp as c, SortAxis as d, SortStrategy as f, SortableOptions as g, SortableHandle as h, GridCollision as i, liftNode as j, fixedLocalCoords as k, SORTABLE_KEY_ATTR as l, SortableContext as m, SortableRow as n, LiftState as o, Sortable as p, FLIP_MOVE_THRESHOLD_PX as r, MidEntry as s, SortableList as t, SORTABLE_LIFTED_ATTR as u, TargetFromMidsOptions as v, applyMove as w, TransferRegistry as x, TransferContainer as y, resolveAnimationDuration as z };