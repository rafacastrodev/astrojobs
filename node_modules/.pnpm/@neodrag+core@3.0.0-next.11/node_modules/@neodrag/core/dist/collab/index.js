import { o as warnOnce } from "../utils-BRN9X2Lx.js";
import { l as applyMove, v as moveOpFromIndices } from "../sortable--ZstZ5oN.js";
//#region src/collab/index.ts
/** Derive the stable anchor for inserting `itemId` at `toIndex` of `order`. */
function anchorFor(order, itemId, to_index) {
	const from = order.indexOf(itemId);
	if (from === -1) return {
		itemId,
		afterId: to_index <= 0 ? null : order[to_index - 1] ?? null
	};
	const op = moveOpFromIndices(order, from, to_index);
	return {
		itemId: op.itemId,
		afterId: op.afterId
	};
}
/**
* Resolve an anchor to a concrete zero-based insert index in `order` (the index the dragged
* item occupies *after* removal of itself). Mirrors `applyMove`'s placement rules so the
* displayed ghost and the eventual committed op agree.
*/
function resolveInsertIndex(order, anchor) {
	const without = order.filter((k) => k !== anchor.itemId);
	if (anchor.afterId === null) return 0;
	const at = without.indexOf(anchor.afterId);
	if (at === -1) return without.length;
	return at + 1;
}
/**
* The Room's order engine. Anchor-based multi-list reconciliation (keyed by
* target id) and adds `transfer` ops, so a kanban move between two lists folds both sides. Owns the
* same mid-drag rebase: a remote op re-resolves the in-flight anchor against the shifted order so a
* concurrent reorder moves the *neighbour*, not the ghost. Pure/DOM-free — the sortable handle owns
* the visuals.
*/
var RoomReconciler = class {
	#orders = /* @__PURE__ */ new Map();
	#inflight = null;
	#insert_index = -1;
	/** Seed (or replace) the canonical order for one list. */
	seed(target, keys) {
		this.#orders.set(target, keys.slice());
	}
	/** Current canonical order for a list ('' fallback for an unseeded target). */
	orderOf(target) {
		return this.#orders.get(target) ?? [];
	}
	get isDragging() {
		return this.#inflight !== null;
	}
	/** Insert index the in-flight ghost occupies in its target list (-1 when idle). */
	get insertIndex() {
		return this.#insert_index;
	}
	/** Begin tracking a local in-flight sortable drag from a presence frame. */
	beginLocal(presence) {
		const order = this.orderOf(presence.target);
		const anchor = anchorFor(order, presence.itemId, presence.insertIndex);
		this.#inflight = {
			target: presence.target,
			from_target: presence.fromTarget,
			item_id: presence.itemId,
			after_id: anchor.afterId
		};
		this.#insert_index = resolveInsertIndex(order, anchor);
	}
	/** Update the in-flight anchor as the local pointer moves. */
	updateLocal(presence) {
		const order = this.orderOf(presence.target);
		const anchor = anchorFor(order, presence.itemId, presence.insertIndex);
		this.#inflight = {
			target: presence.target,
			from_target: presence.fromTarget,
			item_id: presence.itemId,
			after_id: anchor.afterId
		};
		this.#insert_index = resolveInsertIndex(order, anchor);
	}
	/** End the local drag, optionally folding the committed op into the canonical order(s). */
	endLocal(op) {
		if (op) this.#fold(op);
		this.#inflight = null;
		this.#insert_index = -1;
	}
	/**
	* Fold a remote op into the canonical order(s) and rebase any in-flight drag. If the op
	* *transfers away the very item being dragged*, the in-flight anchor is meaningless and is
	* dropped; otherwise the anchor re-resolves against the shifted order (the drag continues).
	*/
	applyRemote(op) {
		this.#fold(op);
		if (!this.#inflight) return {
			insertIndex: -1,
			rebased: false,
			inflight: false
		};
		const prev = this.#insert_index;
		if (op.type === "transfer" && op.itemId === this.#inflight.item_id) {
			this.#inflight = null;
			this.#insert_index = -1;
			return {
				insertIndex: -1,
				rebased: prev !== -1,
				inflight: false
			};
		}
		const insert_index = resolveInsertIndex(this.orderOf(this.#inflight.target), {
			itemId: this.#inflight.item_id,
			afterId: this.#inflight.after_id
		});
		this.#insert_index = insert_index;
		return {
			insertIndex: insert_index,
			rebased: insert_index !== prev,
			inflight: true
		};
	}
	/** Apply an op to the canonical order(s) — move within a list, transfer across two. */
	#fold(op) {
		if (op.type === "move") {
			this.seed(op.target, applyMove(this.orderOf(op.target), {
				itemId: op.itemId,
				afterId: op.afterId
			}));
			return;
		}
		this.seed(op.from, this.orderOf(op.from).filter((k) => k !== op.itemId));
		const to = this.orderOf(op.target).filter((k) => k !== op.itemId);
		const at = op.afterId === null ? 0 : to.indexOf(op.afterId) === -1 ? to.length : to.indexOf(op.afterId) + 1;
		to.splice(at, 0, op.itemId);
		this.seed(op.target, to);
	}
};
const now = () => typeof performance !== "undefined" ? performance.now() : Date.now();
/**
* Throttled presence broadcaster + remote-presence store. Outbound frames are rate-limited
* (leading + trailing edge) so a 120Hz pointer doesn't flood the channel; inbound frames are
* stored per-peer and surfaced for ghost rendering. A `null` publish (drag end) always flushes
* immediately so peers never see a stuck ghost.
*/
var PresenceChannel = class {
	#transport;
	#throttle_ms;
	#remote = /* @__PURE__ */ new Map();
	#listeners = /* @__PURE__ */ new Set();
	#off = null;
	#last_sent_at = -Infinity;
	#pending = null;
	#has_pending = false;
	#timer = null;
	constructor(transport, throttle_ms = 40) {
		this.#transport = transport;
		this.#throttle_ms = throttle_ms;
		this.#off = transport.subscribe((peerId, presence) => this.#on_remote(peerId, presence));
	}
	/** Broadcast our in-flight drag. `null` ends presence (flushed immediately). */
	broadcast(presence) {
		if (presence === null) {
			this.#flush_null();
			return;
		}
		const elapsed = now() - this.#last_sent_at;
		if (elapsed >= this.#throttle_ms) {
			this.#send(presence);
			return;
		}
		this.#pending = presence;
		this.#has_pending = true;
		if (this.#timer === null) this.#timer = setTimeout(() => this.#trailing(), this.#throttle_ms - elapsed);
	}
	/** All remote peers' in-flight presence, by peer id. */
	remotePresences() {
		return this.#remote;
	}
	/** Subscribe to remote presence changes (for ghost rendering). */
	onPresence(handler) {
		this.#listeners.add(handler);
		return () => this.#listeners.delete(handler);
	}
	dispose() {
		if (this.#timer !== null) {
			clearTimeout(this.#timer);
			this.#timer = null;
		}
		this.#off?.();
		this.#off = null;
		this.#listeners.clear();
		this.#remote.clear();
	}
	#trailing() {
		this.#timer = null;
		if (!this.#has_pending || this.#pending === null) return;
		const frame = this.#pending;
		this.#pending = null;
		this.#has_pending = false;
		this.#send(frame);
	}
	#flush_null() {
		if (this.#timer !== null) {
			clearTimeout(this.#timer);
			this.#timer = null;
		}
		this.#pending = null;
		this.#has_pending = false;
		this.#last_sent_at = now();
		this.#transport.publish(null);
	}
	#send(presence) {
		this.#last_sent_at = now();
		this.#transport.publish(presence);
	}
	#on_remote(peerId, presence) {
		if (presence === null) this.#remote.delete(peerId);
		else this.#remote.set(peerId, presence);
		for (const l of this.#listeners) l(peerId, presence);
	}
};
/**
* In-process presence transport mirroring `MemoryCollab` — connect two channels and presence
* frames round-trip. For tests/demos with no network.
*/
var MemoryPresence = class {
	#peerId;
	#handlers = /* @__PURE__ */ new Set();
	#peers = /* @__PURE__ */ new Set();
	constructor(peerId) {
		this.#peerId = peerId;
	}
	connect(other) {
		this.#peers.add(other);
		other.#peers.add(this);
	}
	publish(presence) {
		for (const peer of this.#peers) for (const h of peer.#handlers) h(this.#peerId, presence);
	}
	subscribe(handler) {
		this.#handlers.add(handler);
		return () => this.#handlers.delete(handler);
	}
};
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
var Room = class {
	#backend;
	#options;
	#presence;
	#reconcile = new RoomReconciler();
	#targets = /* @__PURE__ */ new Map();
	/** Room-level subscriptions (backend op + presence), torn down only by `destroy()`. */
	#cleanups = [];
	/** Per-target disposers — one per `add()` call; `destroy()` flushes all. */
	#target_disposers = /* @__PURE__ */ new Set();
	#ttl = /* @__PURE__ */ new Map();
	/** Reactive-state listeners (framework adapters subscribe for `peers`/`presences`). */
	#subscribers = /* @__PURE__ */ new Set();
	/** Cached immutable state snapshot — invalidated on change so `getSnapshot` is referentially
	*  stable between changes (required by React `useSyncExternalStore`). */
	#snapshot = null;
	#destroyed = false;
	constructor(backend, options = {}) {
		this.#backend = backend;
		this.#options = options;
		this.#presence = new PresenceChannel(backend.presence, options.presenceThrottleMs);
		this.#cleanups.push(backend.onRemoteOp((op) => this.#on_remote_op(op)));
		this.#cleanups.push(this.#presence.onPresence((peerId, frame) => this.#on_remote_presence(peerId, frame)));
	}
	/**
	* Add a target (any object satisfying {@link CollabTarget}). `id` overrides the target's own id.
	* Returns a disposer that removes just this target (its subs + map entry) — call it when the
	* target unmounts. The framework adapters call this; `destroy()` flushes any that remain.
	*/
	add(target, id) {
		if (id != null) target.update({ id });
		const target_id = id ?? target.targetId;
		if (id == null && !target.hasExplicitId) warnOnce("room:id", "a target joined a Room without an explicit `id` — auto ids are peer-local and will not match across collaborating clients. Pass `room.add(target, id)` or give the target a stable `id`.");
		this.#targets.set(target_id, target);
		const keys = target.keys?.();
		if (keys) this.#reconcile.seed(target_id, keys);
		const off_commit = target.onCommit((op) => {
			if (this.#destroyed) return;
			if (op.type === "move" || op.type === "transfer") this.#reconcile.endLocal(op);
			this.#backend.sendOp(op);
		});
		const off_presence = target.onPresence((p) => {
			if (this.#destroyed) return;
			if (p === null) {
				this.#presence.broadcast(null);
				return;
			}
			let frame = {
				...p,
				peerId: this.#backend.peerId
			};
			if (p.type === "sortable") {
				if (this.#reconcile.isDragging) this.#reconcile.updateLocal(p);
				else this.#reconcile.beginLocal(p);
				frame = {
					...frame,
					insertIndex: this.#reconcile.insertIndex
				};
			}
			this.#presence.broadcast(frame);
		});
		let disposed = false;
		const dispose = () => {
			if (disposed) return;
			disposed = true;
			off_commit();
			off_presence();
			if (this.#targets.get(target_id) === target) this.#targets.delete(target_id);
			this.#target_disposers.delete(dispose);
		};
		this.#target_disposers.add(dispose);
		return dispose;
	}
	/** Subscribe to reactive room state (`peers`/`presences`) changes. Returns an unsubscribe fn. The
	*  framework `useRoom`/`setRoom` wrappers bind this to their native reactive primitive. */
	subscribe(listener) {
		this.#subscribers.add(listener);
		return () => this.#subscribers.delete(listener);
	}
	/** Connected peer ids (those with active in-flight presence). Referentially stable between changes. */
	get peers() {
		return this.#snap().peers;
	}
	/** Remote peers' in-flight presence, by peer id. Referentially stable between changes. */
	get presences() {
		return this.#snap().presences;
	}
	#snap() {
		if (!this.#snapshot) {
			const presences = new Map(this.#presence.remotePresences());
			this.#snapshot = {
				presences,
				peers: [...presences.keys()]
			};
		}
		return this.#snapshot;
	}
	#emit_change() {
		this.#snapshot = null;
		for (const fn of this.#subscribers) fn();
	}
	/** Tear down every subscription (room-level + any remaining per-target). Targets' own `on*`
	*  callbacks keep firing locally. */
	destroy() {
		this.#destroyed = true;
		for (const off of this.#cleanups) off();
		this.#cleanups.length = 0;
		for (const dispose of [...this.#target_disposers]) dispose();
		this.#target_disposers.clear();
		for (const t of this.#ttl.values()) clearTimeout(t);
		this.#ttl.clear();
		this.#subscribers.clear();
		this.#presence.dispose();
	}
	#on_remote_op(op) {
		if (op.type === "move" || op.type === "transfer") this.#reconcile.applyRemote(op);
		this.#targets.get(op.target)?.applyExternal(op);
		this.#options.onRemoteOp?.(op);
	}
	#on_remote_presence(peerId, frame) {
		if (frame === null) {
			for (const t of this.#targets.values()) t.clearRemotePresence(peerId);
			this.#clear_ttl(peerId);
			this.#options.onRemotePresence?.(null);
			this.#emit_change();
			return;
		}
		this.#targets.get(frame.target)?.showRemotePresence(frame, { mirror: this.#options.mirror });
		this.#arm_ttl(peerId);
		this.#options.onRemotePresence?.(frame);
		this.#emit_change();
	}
	#arm_ttl(peerId) {
		this.#clear_ttl(peerId);
		const ttl = this.#options.presenceTtlMs ?? 0;
		if (ttl <= 0) return;
		this.#ttl.set(peerId, setTimeout(() => {
			this.#ttl.delete(peerId);
			for (const t of this.#targets.values()) t.clearRemotePresence(peerId, { ease: true });
			this.#options.onRemotePresence?.(null);
			this.#emit_change();
		}, ttl));
	}
	#clear_ttl(peerId) {
		const t = this.#ttl.get(peerId);
		if (t !== void 0) {
			clearTimeout(t);
			this.#ttl.delete(peerId);
		}
	}
	/** The ops-only minimal path (no presence) — wire a single target to a provider. The low-level
	*  primitive under a full Room; returns a teardown fn. */
	static bind(target, provider) {
		const off_commit = target.onCommit((op) => provider.sendOp(op));
		const off_remote = provider.onRemoteOp((op) => target.applyExternal(op));
		return () => {
			off_commit();
			off_remote();
		};
	}
	/** A single in-process backend (no network) — for tests/demos. */
	static memory(peerId) {
		return new MemoryBackend(peerId);
	}
	/** Two connected in-process backends sharing op + presence channels — for two-peer tests/demos. */
	static memoryPair(idA, idB) {
		return MemoryBackend.pair(idA, idB);
	}
};
/** Trivial single-process provider connecting peers — for tests/demos (no network). */
var MemoryCollab = class {
	#handlers = /* @__PURE__ */ new Set();
	#peers = /* @__PURE__ */ new Set();
	connect(other) {
		this.#peers.add(other);
		other.#peers.add(this);
	}
	sendOp(op) {
		for (const peer of this.#peers) for (const handler of peer.#handlers) handler(op);
	}
	onRemoteOp(handler) {
		this.#handlers.add(handler);
		return () => this.#handlers.delete(handler);
	}
};
/**
* A complete in-process `CollabBackend` (durable ops via `MemoryCollab` + ephemeral presence
* via `MemoryPresence`). Connect two with `MemoryBackend.pair(...)` for a two-peer test.
*/
var MemoryBackend = class MemoryBackend {
	peerId;
	#collab = new MemoryCollab();
	presence;
	constructor(peerId) {
		this.peerId = peerId;
		this.presence = new MemoryPresence(peerId);
	}
	/** Build two connected backends sharing both an op channel and a presence channel. */
	static pair(idA, idB) {
		const a = new MemoryBackend(idA);
		const b = new MemoryBackend(idB);
		a.#collab.connect(b.#collab);
		a.presence.connect(b.presence);
		return [a, b];
	}
	sendOp(op) {
		this.#collab.sendOp(op);
	}
	onRemoteOp(handler) {
		return this.#collab.onRemoteOp(handler);
	}
};
//#endregion
export { MemoryBackend, MemoryCollab, MemoryPresence, PresenceChannel, Room, RoomReconciler, anchorFor, resolveInsertIndex };
