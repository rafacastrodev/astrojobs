import { a as Mirror, i as LocalPresence, l as SortableOp, n as CollabTarget, o as PresenceFrame, t as CollabOp } from "./collab-types-Y3M0X2KT.js";

//#region src/collab/index.d.ts
/**
 * Anchor-based description of an in-flight insert. `afterId` is the key the dragged item
 * would land immediately after (`null` = front). Unlike a raw `toIndex`, an anchor survives
 * concurrent remote inserts/deletes — which is the whole reason a mid-drag rebase converges.
 */
interface InsertAnchor {
  itemId: string;
  afterId: string | null;
}
/** Derive the stable anchor for inserting `itemId` at `toIndex` of `order`. */
declare function anchorFor(order: readonly string[], itemId: string, to_index: number): InsertAnchor;
/**
 * Resolve an anchor to a concrete zero-based insert index in `order` (the index the dragged
 * item occupies *after* removal of itself). Mirrors `applyMove`'s placement rules so the
 * displayed ghost and the eventual committed op agree.
 */
declare function resolveInsertIndex(order: readonly string[], anchor: InsertAnchor): number;
/** The sortable variant of a local presence frame — what `beginLocal`/`updateLocal` consume. */
type SortablePresenceFrame = Extract<LocalPresence, {
  type: 'sortable';
}>;
/** Outcome of folding a remote sortable op while a local drag may be in flight. */
interface RoomRebaseResult {
  /** The in-flight insert index after the fold (-1 when no drag, or the drag dissolved). */
  insertIndex: number;
  /** True when the fold shifted the in-flight insert index. */
  rebased: boolean;
  /** Whether a local drag is still in flight after the fold. */
  inflight: boolean;
}
/**
 * The Room's order engine. Anchor-based multi-list reconciliation (keyed by
 * target id) and adds `transfer` ops, so a kanban move between two lists folds both sides. Owns the
 * same mid-drag rebase: a remote op re-resolves the in-flight anchor against the shifted order so a
 * concurrent reorder moves the *neighbour*, not the ghost. Pure/DOM-free — the sortable handle owns
 * the visuals.
 */
declare class RoomReconciler {
  #private;
  /** Seed (or replace) the canonical order for one list. */
  seed(target: string, keys: readonly string[]): void;
  /** Current canonical order for a list ('' fallback for an unseeded target). */
  orderOf(target: string): readonly string[];
  get isDragging(): boolean;
  /** Insert index the in-flight ghost occupies in its target list (-1 when idle). */
  get insertIndex(): number;
  /** Begin tracking a local in-flight sortable drag from a presence frame. */
  beginLocal(presence: SortablePresenceFrame): void;
  /** Update the in-flight anchor as the local pointer moves. */
  updateLocal(presence: SortablePresenceFrame): void;
  /** End the local drag, optionally folding the committed op into the canonical order(s). */
  endLocal(op?: SortableOp): void;
  /**
   * Fold a remote op into the canonical order(s) and rebase any in-flight drag. If the op
   * *transfers away the very item being dragged*, the in-flight anchor is meaningless and is
   * dropped; otherwise the anchor re-resolves against the shifted order (the drag continues).
   */
  applyRemote(op: SortableOp): RoomRebaseResult;
}
type PresenceHandler = (peerId: string, presence: PresenceFrame | null) => void;
/** Pluggable transport for presence frames. Backends (Yjs Awareness, Liveblocks) implement it. */
interface PresenceTransport {
  publish(presence: PresenceFrame | null): void;
  subscribe(handler: PresenceHandler): () => void;
}
/**
 * Throttled presence broadcaster + remote-presence store. Outbound frames are rate-limited
 * (leading + trailing edge) so a 120Hz pointer doesn't flood the channel; inbound frames are
 * stored per-peer and surfaced for ghost rendering. A `null` publish (drag end) always flushes
 * immediately so peers never see a stuck ghost.
 */
declare class PresenceChannel {
  #private;
  constructor(transport: PresenceTransport, throttle_ms?: number);
  /** Broadcast our in-flight drag. `null` ends presence (flushed immediately). */
  broadcast(presence: PresenceFrame | null): void;
  /** All remote peers' in-flight presence, by peer id. */
  remotePresences(): ReadonlyMap<string, PresenceFrame>;
  /** Subscribe to remote presence changes (for ghost rendering). */
  onPresence(handler: PresenceHandler): () => void;
  dispose(): void;
}
/**
 * In-process presence transport mirroring `MemoryCollab` — connect two channels and presence
 * frames round-trip. For tests/demos with no network.
 */
declare class MemoryPresence implements PresenceTransport {
  #private;
  constructor(peerId: string);
  connect(other: MemoryPresence): void;
  publish(presence: PresenceFrame | null): void;
  subscribe(handler: PresenceHandler): () => void;
}
/** Backend a {@link Room} needs: a durable op channel + an ephemeral presence one. */
interface CollabBackend {
  /** Stable id for this peer (used as the presence key). */
  peerId: string;
  sendOp(op: CollabOp): void;
  onRemoteOp(handler: (op: CollabOp) => void): () => void;
  presence: PresenceTransport;
}
interface RoomOptions {
  /** Presence throttle in ms. Default 40. */
  presenceThrottleMs?: number;
  /**
   * Auto-clear a remote peer's presence this many ms after its last frame (when no terminal `null`
   * frame arrived — e.g. the peer dropped offline mid-gesture). `0` disables the sweep. Default `0`.
   */
  presenceTtlMs?: number;
  /** Called when a remote peer's in-flight presence changes (`null` = the gesture ended or expired). */
  onRemotePresence?: (frame: PresenceFrame | null) => void;
  /** Called for every remote op after it's routed + applied — an observability hook (e.g. a "synced"
   *  pulse). The op is already applied to its target; this is purely a notification. */
  onRemoteOp?: (op: CollabOp) => void;
  /** Where to render a remote sortable drag's floating clone (see {@link Mirror}). */
  mirror?: Mirror;
}
/**
 * The unified collaborative orchestrator — the single public entry point. Any number of targets
 * (a sortable list, a draggable box, a resizable panel, a rotatable) `join` one Room over a
 * {@link CollabBackend}; the Room runs the full deep loop for every one:
 *
 *  - **outbound ops**: each target's commits flow out as durable `CollabOp`s (`move`/`transfer`/
 *    `drag`/`resize`/`rotate`), folded into the {@link RoomReconciler} for sortable lists.
 *  - **inbound ops**: a remote op is routed to its target by `op.target` and applied through the
 *    same path a local commit uses; sortable ops also rebase any in-flight drag (mid-drag rebase).
 *  - **presence**: in-flight gestures broadcast a throttled {@link PresenceFrame}; remote frames
 *    render a ghost on the matching target and arm a TTL sweep so a vanished peer leaves no stuck ghost.
 *
 * Construct with a backend (use `Room.memoryPair` for in-process tests/demos), then `room.add(target)`.
 */
declare class Room {
  #private;
  constructor(backend: CollabBackend, options?: RoomOptions);
  /**
   * Add a target (any object satisfying {@link CollabTarget}). `id` overrides the target's own id.
   * Returns a disposer that removes just this target (its subs + map entry) — call it when the
   * target unmounts. The framework adapters call this; `destroy()` flushes any that remain.
   */
  add(target: CollabTarget, id?: string): () => void;
  /** Subscribe to reactive room state (`peers`/`presences`) changes. Returns an unsubscribe fn. The
   *  framework `useRoom`/`setRoom` wrappers bind this to their native reactive primitive. */
  subscribe(listener: () => void): () => void;
  /** Connected peer ids (those with active in-flight presence). Referentially stable between changes. */
  get peers(): readonly string[];
  /** Remote peers' in-flight presence, by peer id. Referentially stable between changes. */
  get presences(): ReadonlyMap<string, PresenceFrame>;
  /** Tear down every subscription (room-level + any remaining per-target). Targets' own `on*`
   *  callbacks keep firing locally. */
  destroy(): void;
  /** The ops-only minimal path (no presence) — wire a single target to a provider. The low-level
   *  primitive under a full Room; returns a teardown fn. */
  static bind(target: CollabTarget, provider: CollabProvider): () => void;
  /** A single in-process backend (no network) — for tests/demos. */
  static memory(peerId: string): MemoryBackend;
  /** Two connected in-process backends sharing op + presence channels — for two-peer tests/demos. */
  static memoryPair(idA: string, idB: string): [MemoryBackend, MemoryBackend];
}
declare namespace Room {
  type Options = RoomOptions;
  type Target = CollabTarget;
  type Op = CollabOp;
  type Backend = CollabBackend;
  type Provider = CollabProvider;
  type Presence = PresenceFrame;
  type Mirror = Mirror;
}
/**
 * The ops-only seam {@link Room.bind} drives — a durable op channel with no presence. Per-backend
 * adapters (`@neodrag/yjs`, `@neodrag/liveblocks`, …) implement it; the core stays CRDT-agnostic.
 */
interface CollabProvider {
  /** Publish a durable op to peers. */
  sendOp(op: CollabOp): void;
  /** Subscribe to remote ops. Returns an unsubscribe fn. */
  onRemoteOp(handler: (op: CollabOp) => void): () => void;
  /** Ephemeral presence, never persisted. Optional. */
  sendPresence?(presence: LocalPresence | null): void;
}
/** Trivial single-process provider connecting peers — for tests/demos (no network). */
declare class MemoryCollab implements CollabProvider {
  #private;
  connect(other: MemoryCollab): void;
  sendOp(op: CollabOp): void;
  onRemoteOp(handler: (op: CollabOp) => void): () => void;
}
/**
 * A complete in-process `CollabBackend` (durable ops via `MemoryCollab` + ephemeral presence
 * via `MemoryPresence`). Connect two with `MemoryBackend.pair(...)` for a two-peer test.
 */
declare class MemoryBackend implements CollabBackend {
  #private;
  readonly peerId: string;
  readonly presence: MemoryPresence;
  constructor(peerId: string);
  /** Build two connected backends sharing both an op channel and a presence channel. */
  static pair(idA: string, idB: string): [MemoryBackend, MemoryBackend];
  sendOp(op: CollabOp): void;
  onRemoteOp(handler: (op: CollabOp) => void): () => void;
}
//#endregion
export { MemoryCollab as a, PresenceHandler as c, RoomOptions as d, RoomRebaseResult as f, resolveInsertIndex as h, MemoryBackend as i, PresenceTransport as l, anchorFor as m, CollabProvider as n, MemoryPresence as o, RoomReconciler as p, InsertAnchor as r, PresenceChannel as s, CollabBackend as t, Room as u };