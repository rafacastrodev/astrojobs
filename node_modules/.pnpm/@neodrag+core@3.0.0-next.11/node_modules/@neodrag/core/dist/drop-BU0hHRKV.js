import { isNativeDndInput, nativeDropFiles, nativeDropText } from "./interaction/index.js";
import { i as listen, t as autoId } from "./utils-BRN9X2Lx.js";
import { n as sharedEngine, t as sharedCapability } from "./shared-5VBBgXhD.js";
import { n as NativeDndSensor } from "./native-dnd-CSmgQ2Lc.js";
//#region src/drop/drop.ts
var LinearCollisionIndex = class {
	#rects = /* @__PURE__ */ new Map();
	insert(id, rect) {
		this.#rects.set(id, rect);
	}
	update(id, rect) {
		this.#rects.set(id, rect);
	}
	remove(id) {
		this.#rects.delete(id);
	}
	clear() {
		this.#rects.clear();
	}
	query(x, y) {
		const hits = [];
		for (const [id, r] of this.#rects) if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) hits.push(id);
		return hits;
	}
};
function centerDistanceSq(r, x, y) {
	const cx = (r.left + r.right) / 2;
	const cy = (r.top + r.bottom) / 2;
	const dx = x - cx;
	const dy = y - cy;
	return dx * dx + dy * dy;
}
/** Squared distance from a point to the nearest edge of `r` (0 when the point is inside). */
function edgeDistanceSq(r, x, y) {
	const dx = Math.max(r.left - x, 0, x - r.right);
	const dy = Math.max(r.top - y, 0, y - r.bottom);
	return dx * dx + dy * dy;
}
/** Overlap area (px²) between two rects; 0 when disjoint. Used by the `'intersection'` policy. */
function intersectionArea(a, b) {
	const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
	const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
	return w > 0 && h > 0 ? w * h : 0;
}
/** True when `a` should rank ahead of `b` for the closest-* / intersection policies at (x,y). */
function beatsTie(a, b, x, y, ctx) {
	if ((a.policy === "intersection" || b.policy === "intersection") && ctx?.probeRect) return intersectionArea(a.rect, ctx.probeRect) > intersectionArea(b.rect, ctx.probeRect);
	if (a.policy === "closestEdge" || b.policy === "closestEdge") return edgeDistanceSq(a.rect, x, y) < edgeDistanceSq(b.rect, x, y);
	if (a.policy === "closestCenter" || b.policy === "closestCenter") return centerDistanceSq(a.rect, x, y) < centerDistanceSq(b.rect, x, y);
	return false;
}
/**
* The single ranking function (replaces the duplicate logic the teardown found in
* `drop-targets.ts` and `interaction-coordinator.ts`). Highest priority wins; ties are
* broken by the strategy either candidate prefers (closest-center / closest-edge / max
* intersection-area). `ctx.probeRect` is the dragged element's rect for the area strategy.
*/
function rankDrop(candidates, x, y, ctx) {
	if (candidates.length === 0) return null;
	let best = candidates[0];
	for (let i = 1; i < candidates.length; i++) {
		const c = candidates[i];
		if (c.priority > best.priority) {
			best = c;
			continue;
		}
		if (c.priority < best.priority) continue;
		if (beatsTie(c, best, x, y, ctx)) best = c;
	}
	return best;
}
function corners(rect) {
	return [
		{
			x: rect.left,
			y: rect.top
		},
		{
			x: rect.right,
			y: rect.top
		},
		{
			x: rect.left,
			y: rect.bottom
		},
		{
			x: rect.right,
			y: rect.bottom
		}
	];
}
function edgeMidpoints(rect) {
	const cx = (rect.left + rect.right) / 2;
	const cy = (rect.top + rect.bottom) / 2;
	return [
		{
			x: cx,
			y: rect.top
		},
		{
			x: cx,
			y: rect.bottom
		},
		{
			x: rect.left,
			y: cy
		},
		{
			x: rect.right,
			y: cy
		}
	];
}
function center(rect) {
	return {
		x: (rect.left + rect.right) / 2,
		y: (rect.top + rect.bottom) / 2
	};
}
/** Resolve the `dropPointerSamples` option (mode preset OR custom sampler) to a sampler fn. */
function resolveSampler(mode) {
	if (typeof mode === "function") return mode;
	const m = mode ?? "pointer";
	if (m === "pointer") return ({ pointer }) => [pointer];
	return ({ pointer, rect }) => {
		const pts = [pointer];
		if (!rect) return pts;
		if (m === "center") {
			pts.push(center(rect));
			return pts;
		}
		pts.push(...corners(rect));
		if (m === "edges" || m === "all") pts.push(...edgeMidpoints(rect));
		if (m === "all") pts.push(center(rect));
		return pts;
	};
}
/**
* rAF coalescer ported from `drop-targets.ts` (`queueUpdate`/`flush`/`reset`). Pointer moves can
* fire many times per frame (high-Hz mice, coalesced native events). Hit-testing every move is
* wasteful — the geometry only matters once per paint. This batches: any number of `schedule()`
* calls inside one frame collapse to a single `run` callback at the next animation frame, and the
* latest value wins. `flush()` runs synchronously (for the drop commit on pointerup), cancelling
* any pending frame so we never double-run.
*/
var RafBatch = class {
	#run;
	#raf_id = 0;
	#pending = null;
	#has = false;
	constructor(run) {
		this.#run = run;
	}
	/** True while a frame is queued but not yet fired. */
	get scheduled() {
		return this.#raf_id !== 0;
	}
	/** Coalesce: store the latest value, schedule one frame if none is pending. */
	schedule(value) {
		this.#pending = value;
		this.#has = true;
		if (this.#raf_id) return;
		this.#raf_id = requestAnimationFrame(() => {
			this.#raf_id = 0;
			if (!this.#has) return;
			const v = this.#pending;
			this.#has = false;
			this.#pending = null;
			this.#run(v);
		});
	}
	/** Run synchronously now (drop/end path), cancelling any pending frame. */
	flush(value) {
		this.cancel();
		this.#has = false;
		this.#pending = null;
		this.#run(value);
	}
	/** Cancel a pending frame and drop the stored value without running. */
	cancel() {
		if (this.#raf_id) {
			cancelAnimationFrame(this.#raf_id);
			this.#raf_id = 0;
		}
		this.#has = false;
		this.#pending = null;
	}
};
/**
* The flagship perf arena's drop-in for the {@link CollisionIndex} seam. Stores rects in a Map
* exactly like `LinearCollisionIndex`, but when a `visible()` provider is given the query phase
* iterates only the virtualizer's on-screen ids — turning a 100k-item drop/sortable hit-test
* into an O(visible) scan. Without the option it degrades to plain linear behavior.
*/
var VirtualCollisionIndex = class {
	#rects = /* @__PURE__ */ new Map();
	#visible;
	constructor(options) {
		this.#visible = options?.visible;
	}
	insert(id, rect) {
		this.#rects.set(id, rect);
	}
	update(id, rect) {
		this.#rects.set(id, rect);
	}
	remove(id) {
		this.#rects.delete(id);
	}
	clear() {
		this.#rects.clear();
	}
	query(x, y) {
		const hits = [];
		const ids = this.#visible ? this.#visible() : this.#rects.keys();
		for (const id of ids) {
			const r = this.#rects.get(id);
			if (r === void 0) continue;
			if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) hits.push(id);
		}
		return hits;
	}
};
const DROP_MARKER = "data-neodrag-over";
/** Set on a zone (value = peer id) while a remote peer is hovering it. */
const REMOTE_HOVER_ATTR = "data-neodrag-remote-hover";
/** Marks the floating cursor dot rendered for a remote peer's hover (value = peer id). */
const REMOTE_HOVER_MARKER_ATTR = "data-neodrag-remote-hover-marker";
/** Optional label on the remote-hover marker — the dragged item's sortable key when known. */
const REMOTE_HOVER_ITEM_ATTR = "data-neodrag-remote-hover-item";
var DropState = class {
	node;
	options;
	isOver = false;
	/** Rect cached at drag-start (invalidated on scroll/resize) — avoids a reflow per move. */
	rect = null;
	/** Auto target id — peer-local; `targetId` prefers `options.id`. */
	auto_target_id = autoId("drop");
	presence_subscribers = /* @__PURE__ */ new Set();
	/** Remote peers' hover cursor markers, keyed by peer id. */
	remote_hovers = /* @__PURE__ */ new Map();
	constructor(node, options) {
		this.node = node;
		this.options = options;
	}
	get targetId() {
		return this.options.id ?? this.auto_target_id;
	}
	get hasExplicitId() {
		return this.options.id != null;
	}
};
var DropHandle = class {
	#drop;
	#state;
	constructor(drop, state) {
		this.#drop = drop;
		this.#state = state;
	}
	update(options) {
		Object.assign(this.#state.options, options);
	}
	/** The zone's stable string id — the `target` in the unified op grammar. */
	get targetId() {
		return this.#state.targetId;
	}
	/** Whether `targetId` came from an explicit `id` option (auto ids are peer-local). */
	get hasExplicitId() {
		return this.#state.hasExplicitId;
	}
	/** A drop has no replayable op — `onCommit` exists to satisfy {@link CollabTarget} but never fires. */
	onCommit(_fn) {
		return () => {};
	}
	onPresence(fn) {
		this.#state.presence_subscribers.add(fn);
		return () => this.#state.presence_subscribers.delete(fn);
	}
	/** No replayable drop op — a no-op (satisfies {@link CollabTarget}). */
	applyExternal(_op) {}
	/** Render a remote peer hovering this zone — mark the zone + drop a floating cursor dot. */
	showRemotePresence(frame) {
		if (frame.type === "drop-hover") this.#drop.showRemotePresence(this.#state, frame);
	}
	clearRemotePresence(peerId) {
		this.#drop.clearRemotePresence(this.#state, peerId);
	}
	destroy() {
		this.#drop.clearRemotePresence(this.#state);
		this.#drop._unbind(this.#state.node);
		this.#state.node.removeAttribute(DROP_MARKER);
	}
};
function expand(r, by) {
	if (!by) return r;
	return {
		left: r.left - by,
		top: r.top - by,
		right: r.right + by,
		bottom: r.bottom + by
	};
}
const DROP_KEY = Symbol("neodrag.drop");
/**
* The drop capability. Never claims a pointerdown — it *observes* drag sessions (via the
* engine's observer hook) and hit-tests registered zones through the pluggable
* `CollisionIndex`. Collision/priority/hit-expand are immutable options, not plugins.
*/
var Drop = class {
	key = DROP_KEY;
	name = "drop";
	#zones = /* @__PURE__ */ new Map();
	#index;
	#sampler;
	#samples_need_rect;
	#coalesce;
	#batch;
	#over = /* @__PURE__ */ new Set();
	#over_next = /* @__PURE__ */ new Set();
	#hit_seen = /* @__PURE__ */ new Set();
	#hit_count = 0;
	#measured = false;
	#on_invalidate = () => {
		this.#measured = false;
	};
	#unlisten_invalidation = [];
	constructor(options = {}) {
		this.#index = options.index ? options.index() : new LinearCollisionIndex();
		this.#sampler = resolveSampler(options.dropPointerSamples);
		this.#samples_need_rect = options.dropPointerSamples != null && options.dropPointerSamples !== "pointer";
		this.#coalesce = options.coalesce === true;
		this.#batch = new RafBatch((session) => this.#update_over(session));
	}
	/** @internal Count of hit-tests run — lets tests assert N moves coalesce to one. */
	get hitCount() {
		return this.#hit_count;
	}
	/** @internal True while a coalesced hit-test frame is queued. */
	get pendingFrame() {
		return this.#batch.scheduled;
	}
	bind(node, options = {}) {
		const state = new DropState(node, options);
		this.#zones.set(node, state);
		this.#measured = false;
		return new DropHandle(this, state);
	}
	/** @internal */
	_unbind(node) {
		this.#zones.delete(node);
		this.#measured = false;
	}
	resolve() {
		return null;
	}
	start() {}
	move() {}
	end() {}
	observe(session, phase, _reason) {
		if (phase === "move") if (this.#coalesce) this.#batch.schedule(session);
		else this.#update_over(session);
		else if (phase === "end") {
			this.#commit(session, _reason);
			this.#teardown_invalidation();
		} else if (phase === "start") {
			this.#batch.cancel();
			this.#hit_count = 0;
			this.#measured = false;
			this.#setup_invalidation();
		}
	}
	#setup_invalidation() {
		if (typeof window === "undefined") return;
		this.#unlisten_invalidation.push(listen(window, "scroll", this.#on_invalidate, {
			capture: true,
			passive: true
		}), listen(window, "resize", this.#on_invalidate, { passive: true }));
	}
	#teardown_invalidation() {
		for (const off of this.#unlisten_invalidation) off();
		this.#unlisten_invalidation.length = 0;
	}
	/** Measure every (accepted) zone's rect once, populate the index. Cheap re-runs are no-ops. */
	#ensure_measured(session) {
		if (this.#measured) return;
		const input = session.input;
		const native = isNativeDndInput(input);
		const drag_node = native ? null : session.target.node;
		const data = native ? null : session.data;
		const types = native && input.dataTransfer ? [...input.dataTransfer.types] : void 0;
		this.#index.clear();
		for (const [node, state] of this.#zones) {
			if (native ? !state.options.native : node === drag_node) {
				state.rect = null;
				continue;
			}
			if (state.options.disabled) {
				state.rect = null;
				continue;
			}
			if (state.options.accepts && !state.options.accepts({
				dragNode: drag_node,
				data,
				types
			})) {
				state.rect = null;
				continue;
			}
			const rect = expand(node.getBoundingClientRect(), state.options.hitExpand ?? 0);
			state.rect = rect;
			this.#index.insert(state, rect);
		}
		this.#measured = true;
	}
	/** Sample points to hit-test this frame: pointer + element-rect samples (multi-sample). */
	#sample_points(session) {
		const pointer = {
			x: session.input.clientX,
			y: session.input.clientY
		};
		return this.#sampler({
			pointer,
			rect: this.#samples_need_rect ? this.#drag_rect(session) : null
		});
	}
	#drag_rect(session) {
		if (isNativeDndInput(session.input)) return null;
		const node = session.target.node;
		if (typeof node.getBoundingClientRect !== "function") return null;
		return node.getBoundingClientRect();
	}
	/** Build the candidate set by hit-testing every sample point and unioning the matches. */
	#candidates(session) {
		this.#hit_count++;
		this.#ensure_measured(session);
		const seen = this.#hit_seen;
		seen.clear();
		const out = [];
		for (const pt of this.#sample_points(session)) for (const hit of this.#index.query(pt.x, pt.y)) {
			if (seen.has(hit)) continue;
			seen.add(hit);
			out.push(hit);
		}
		return out;
	}
	#best(session, candidates) {
		const probe_rect = this.#drag_rect(session);
		const top = rankDrop(candidates.map((state) => ({
			state,
			rect: state.rect ?? state.node.getBoundingClientRect(),
			priority: state.options.priority ?? 0,
			policy: state.options.collision ?? "pointer"
		})), session.input.clientX, session.input.clientY, { probeRect: probe_rect });
		return top ? top.state : null;
	}
	#update_over(session) {
		const candidates = this.#candidates(session);
		const next = this.#over_next;
		next.clear();
		for (const c of candidates) next.add(c);
		for (const state of this.#over) if (!next.has(state)) this.#leave(state, session);
		for (const state of next) if (!state.isOver) this.#enter(state, session);
		this.#over_next = this.#over;
		this.#over = next;
		const best = this.#best(session, candidates);
		if (best) best.options.onOver?.(this.#event(best, session));
	}
	#commit(session, reason) {
		this.#batch.cancel();
		if (reason !== "cancel") {
			const candidates = this.#candidates(session);
			const best = this.#best(session, candidates);
			if (best) best.options.onDrop?.(this.#event(best, session));
		}
		for (const state of this.#over) this.#leave(state, session);
		this.#over.clear();
	}
	#enter(state, session) {
		state.isOver = true;
		state.node.setAttribute(DROP_MARKER, "");
		state.options.onEnter?.(this.#event(state, session));
		this.#pump_hover(state, session);
	}
	#leave(state, session) {
		state.isOver = false;
		state.node.removeAttribute(DROP_MARKER);
		state.options.onLeave?.(this.#event(state, session));
		for (const fn of state.presence_subscribers) fn(null);
	}
	/** Broadcast this peer's live hover over `state`'s zone as a `drop-hover` presence frame. */
	#pump_hover(state, session) {
		if (state.presence_subscribers.size === 0) return;
		const input = session.input;
		const itemId = (isNativeDndInput(input) ? null : session.target.node)?.getAttribute?.("data-neodrag-sortable-key") ?? void 0;
		const frame = {
			type: "drop-hover",
			target: state.targetId,
			x: input.clientX,
			y: input.clientY,
			...itemId ? { itemId } : {}
		};
		for (const fn of state.presence_subscribers) fn(frame);
	}
	/** Render a remote peer hovering `state`'s zone — mark the zone + a floating cursor dot. @internal */
	showRemotePresence(state, frame) {
		if (frame.target !== state.targetId) {
			this.clearRemotePresence(state, frame.peerId);
			return;
		}
		state.node.setAttribute(REMOTE_HOVER_ATTR, frame.peerId);
		let marker = state.remote_hovers.get(frame.peerId);
		if (!marker) {
			marker = document.createElement("div");
			marker.setAttribute(REMOTE_HOVER_MARKER_ATTR, frame.peerId);
			marker.style.cssText = "position:fixed;pointer-events:none;width:0;height:0;";
			document.body.appendChild(marker);
			state.remote_hovers.set(frame.peerId, marker);
		}
		marker.style.left = `${frame.x}px`;
		marker.style.top = `${frame.y}px`;
		if (frame.itemId) marker.setAttribute(REMOTE_HOVER_ITEM_ATTR, frame.itemId);
		else marker.removeAttribute(REMOTE_HOVER_ITEM_ATTR);
	}
	/** Clear a remote peer's hover from `state`'s zone (or all peers when none is given). @internal */
	clearRemotePresence(state, peerId) {
		const remove = (id) => {
			const marker = state.remote_hovers.get(id);
			if (marker) {
				marker.remove();
				state.remote_hovers.delete(id);
			}
			if (state.node.getAttribute("data-neodrag-remote-hover") === id) state.node.removeAttribute(REMOTE_HOVER_ATTR);
		};
		if (peerId) remove(peerId);
		else for (const id of [...state.remote_hovers.keys()]) remove(id);
	}
	#event(state, session) {
		const input = session.input;
		if (isNativeDndInput(input)) {
			const on_drop = input.phase === "end";
			return {
				zone: state.node,
				dragNode: null,
				data: null,
				input,
				files: on_drop ? nativeDropFiles(input.dataTransfer) : [],
				text: on_drop ? nativeDropText(input.dataTransfer) : ""
			};
		}
		return {
			zone: state.node,
			dragNode: session.target.node,
			data: session.data,
			input
		};
	}
};
//#endregion
//#region src/drop/native-drag.ts
const NATIVE_DRAG_KEY = Symbol("neodrag.native-drag");
/**
* Session-host for OS drag-and-drop. It claims the `native-dnd` input stream — at the highest
* priority, so it wins the engine's resolve race over drag/sortable/resize, which would otherwise
* try to claim whatever element the file is dragged over — and does nothing else. `Drop` observes
* the resulting session and handles the zones, exactly as it does for a pointer drag.
*/
var NativeDrag = class {
	key = NATIVE_DRAG_KEY;
	name = "native-drag";
	priority = 1e6;
	resolve(input) {
		return isNativeDndInput(input) ? { node: document.documentElement } : null;
	}
	start(_session) {}
	move(_session) {}
	end(_session) {}
};
let wired = false;
/** Idempotently arm native file/text DnD on the shared engine (session host + sensor). Called by
* the ergonomic `Droppable` when a zone opts in with `native: true`. */
function enableNativeDnd() {
	if (wired) return;
	wired = true;
	sharedEngine().use(new NativeDrag()).registerSensor(new NativeDndSensor());
}
//#endregion
//#region src/drop/droppable.ts
/**
* Ergonomic single-element drop zone: `new Droppable(node, options)`. Shares the engine
* with `Draggable`, so it automatically observes drag sessions. Satisfies the unified
* {@link CollabTarget} seam (drop carries remote-hover presence, no replayable op), so
* `room.add(droppable)` works.
*/
var Droppable = class {
	#handle;
	constructor(node, options = {}) {
		if (options.native) enableNativeDnd();
		this.#handle = sharedCapability(Drop, () => new Drop()).bind(node, options);
	}
	update(options) {
		this.#handle.update(options);
	}
	get targetId() {
		return this.#handle.targetId;
	}
	get hasExplicitId() {
		return this.#handle.hasExplicitId;
	}
	onCommit(fn) {
		return this.#handle.onCommit(fn);
	}
	onPresence(fn) {
		return this.#handle.onPresence(fn);
	}
	applyExternal(op) {
		this.#handle.applyExternal(op);
	}
	showRemotePresence(frame) {
		this.#handle.showRemotePresence(frame);
	}
	clearRemotePresence(peerId) {
		this.#handle.clearRemotePresence(peerId);
	}
	destroy() {
		this.#handle.destroy();
	}
};
//#endregion
export { resolveSampler as _, Drop as a, LinearCollisionIndex as c, RafBatch as d, VirtualCollisionIndex as f, rankDrop as g, intersectionArea as h, enableNativeDnd as i, REMOTE_HOVER_ATTR as l, edgeDistanceSq as m, NATIVE_DRAG_KEY as n, DropHandle as o, centerDistanceSq as p, NativeDrag as r, DropState as s, Droppable as t, REMOTE_HOVER_MARKER_ATTR as u };
