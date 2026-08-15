import { c as RotateOp, i as LocalPresence, n as CollabTarget, o as PresenceFrame, t as CollabOp } from "../collab-types-Y3M0X2KT.js";
import { a as Capability, c as InteractionSession, d as InteractionInput, o as DndNode, s as EndReason, u as ResolvedTarget } from "../types-G2NWiUm6.js";

//#region src/rotate/rotate.d.ts
declare const ROTATE_HANDLE_ATTR = "data-neodrag-rotate-handle";
/** Where the rotation handle sits — purely a marker position, any value is accepted. The common
 *  case is a single grip above the element, but corners work too. */
type RotateHandlePos = 'top' | 'tl' | 'tr' | 'bl' | 'br' | (string & {});
/** Per-handle binding — spread onto a handle element instead of writing the attribute by hand. */
type RotateHandleProps = {
  readonly [ROTATE_HANDLE_ATTR]: string;
};
/**
 * The pivot a rotation turns around: the element's `center` (default), a named corner, or an
 * element-local `{ x, y }` offset in px from the top-left. Pivot is local config — it never rides
 * the wire (only the resulting `angle` does), so two peers may pivot differently yet converge.
 */
type RotateOrigin = 'center' | 'tl' | 'tr' | 'bl' | 'br' | {
  x: number;
  y: number;
};
interface RotateOptions {
  /** Pivot the rotation turns around. Default `'center'`. */
  origin?: RotateOrigin;
  /** Snap the committed/visible angle to a multiple of this many degrees (e.g. `15`). */
  step?: number;
  /** Clamp the angle to `[min, max]` degrees. */
  min?: number;
  max?: number;
  /**
   * Controlled angle in degrees. Pass a reactive getter (`get angle() { … }`) to drive the
   * rotation externally; pair it with a setter for two-way binding (the wrapper writes the live
   * angle back each move). Applied (snapped/clamped via `step`/`min`/`max`) only while no local
   * rotation owns the node, so a gesture isn't fought.
   */
  angle?: number;
  disabled?: boolean;
  /** Suppress text selection while rotating (refcounted body `user-select:none`). Default `true`. */
  userSelect?: boolean;
  /**
   * Stable string id for this rotatable — the `target` in the unified collab op grammar. Required
   * in practice for collab (it must match across peers); an auto id is peer-local.
   */
  id?: string;
  onRotateStart?: (e: RotateEventData) => void;
  onRotate?: (e: RotateEventData) => void;
  onRotateEnd?: (e: RotateEventData) => void;
  /**
   * Pure op stream — fires a serializable `{ type:'rotate', target, angle }` once per rotation that
   * actually changed the angle, on release. The last-write-wins seam `@neodrag/collab` subscribes
   * to; composes with (never replaces) `onRotateEnd`.
   */
  onCommit?: (op: RotateOp) => void;
}
interface RotateEventData {
  angle: number;
  node: DndNode;
  input: InteractionInput;
}
/** In-flight rotate presence — the `rotate` variant of the unified presence frame. */
type RotatePresence = {
  type: 'rotate';
  target: string;
  angle: number;
};
/** A remote peer's live rotation, rendered over the same node. */
type RotateRemoteFrame = {
  peerId: string;
  angle: number;
};
/** Normalize the configured angle: snap to `step`, then clamp to `[min, max]`. Pure for testing. */
declare function normalizeAngle(angle: number, opts: {
  step?: number;
  min?: number;
  max?: number;
}): number;
/** The pivot point in viewport coords for a given origin + element rect. Pure for testing. */
declare function pivotPoint(origin: RotateOrigin, rect: {
  left: number;
  top: number;
  right: number;
  bottom: number;
}): {
  x: number;
  y: number;
};
declare class RotateState {
  readonly node: DndNode;
  options: RotateOptions;
  angle: number;
  initial_angle: number;
  center: {
    x: number;
    y: number;
  };
  initial_pointer_angle: number;
  inverse_scale: number;
  /** True while a local rotate gesture owns the node — remote applies defer to it. */
  rotating: boolean;
  /** Auto target id — peer-local; `targetId` prefers `options.id`. */
  readonly auto_target_id: string;
  readonly commit_subscribers: Set<(op: RotateOp) => void>;
  readonly presence_subscribers: Set<(p: RotatePresence | null) => void>;
  /** The peer whose remote rotation is currently rendered over this node, or null. */
  remote_peer: string | null;
  /** A remote op that arrived while a local rotate owned the node — applied on end if the local
   * gesture produced no commit, so a suppressed remote value isn't lost. */
  pending_remote: RotateOp | null;
  constructor(node: DndNode, options: RotateOptions);
  get targetId(): string;
  get hasExplicitId(): boolean;
  event(input: InteractionInput): RotateEventData;
}
declare class RotateHandle {
  #private;
  constructor(rotate: Rotate, state: RotateState);
  update(options: Partial<RotateOptions>): void;
  /** The current angle in degrees. */
  get angle(): number;
  /** The rotatable's stable string id — the `target` in the unified op grammar. */
  get targetId(): string;
  /** Whether `targetId` came from an explicit `id` option (auto ids are peer-local). */
  get hasExplicitId(): boolean;
  onCommit(fn: (op: CollabOp) => void): () => void;
  onPresence(fn: (p: LocalPresence | null) => void): () => void;
  /** Apply a remote rotate fact — turns the node to the committed angle (eased). Foreign kinds
   * ignored — this is the unified `CollabTarget.applyExternal`. */
  applyExternal(op: CollabOp): void;
  showRemotePresence(frame: PresenceFrame): void;
  clearRemotePresence(peerId?: string): void;
  destroy(): void;
}
/**
 * The rotate capability. Claims pointerdowns that land on a rotate handle element
 * (`data-neodrag-rotate-handle`), at a higher priority than resize so a grip wins over an
 * overlapping resize edge. Writes the individual CSS `rotate` property (HTML) so it composes with
 * drag's `translate` and resize's size on the same element.
 */
declare class Rotate implements Capability {
  #private;
  readonly key: symbol;
  readonly name = "rotate";
  readonly priority = 110;
  bind(node: DndNode, options?: RotateOptions): RotateHandle;
  /** @internal */
  _unbind(node: DndNode): void;
  /** @internal Apply a controlled angle (snapped/clamped via `step`/`min`/`max`) outside a gesture. */
  _applyControlledAngle(state: RotateState, angle: number): void;
  resolve(input: InteractionInput): ResolvedTarget | null;
  start(session: InteractionSession): void;
  move(session: InteractionSession): void;
  end(session: InteractionSession, _reason: EndReason): void;
  /** Apply a remote rotate fact — set the angle and glide there. A no-op while a local rotate owns
   *  the node (stashed, applied on end if the local gesture commits nothing). */
  applyExternal(state: RotateState, op: RotateOp): void;
  showRemotePresence(state: RotateState, frame: RotateRemoteFrame): void;
  clearRemotePresence(state: RotateState, peerId?: string): void;
}
//#endregion
//#region src/rotate/rotatable.d.ts
/** Ergonomic single-element rotate: `new Rotatable(node, options)`. Satisfies the unified
 * {@link CollabTarget} seam, so `room.add(rotatable)` works. */
declare class Rotatable implements CollabTarget {
  #private;
  constructor(node: DndNode, options?: RotateOptions);
  /** Targeted, fine-grained update — only the provided keys are written. */
  update(options: Partial<RotateOptions>): void;
  /** The current angle in degrees. */
  get angle(): number;
  /** The rotatable's stable string id — the `target` in the unified collab op grammar. */
  get targetId(): string;
  /** Whether `targetId` came from an explicit `id` option (auto ids are peer-local). */
  get hasExplicitId(): boolean;
  /** Subscribe to committed ops (additive — composes with `options.onCommit`). */
  onCommit(fn: (op: CollabOp) => void): () => void;
  /** Subscribe to in-flight presence (`null` = rotate ended). */
  onPresence(fn: (p: LocalPresence | null) => void): () => void;
  /** Apply a remote rotate fact — spins the node to the committed angle (eased). Foreign kinds ignored. */
  applyExternal(op: CollabOp): void;
  /** Render a remote peer's in-flight rotation over this node (live eased angle). */
  showRemotePresence(frame: PresenceFrame): void;
  /** Clear a peer's remote presence, easing back to the committed angle. */
  clearRemotePresence(peerId?: string): void;
  destroy(): void;
}
//#endregion
export { ROTATE_HANDLE_ATTR, Rotatable, Rotate, type RotateEventData, RotateHandle, type RotateHandlePos, type RotateHandleProps, type RotateOptions, type RotateOrigin, type RotatePresence, type RotateRemoteFrame, RotateState, normalizeAngle, pivotPoint };