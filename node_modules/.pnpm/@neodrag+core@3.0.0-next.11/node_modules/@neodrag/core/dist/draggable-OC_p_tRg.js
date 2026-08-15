import { isPointerInput } from "./interaction/index.js";
import { o as warnOnce, t as autoId } from "./utils-BRN9X2Lx.js";
import { t as sharedCapability } from "./shared-5VBBgXhD.js";
import { i as clearTranslate, r as applyTranslate, t as TRANSLATE_DRAG } from "./transform-CZpREI4A.js";
import { t as inverseScaleFromNode } from "./inverse-scale-BCb2f85l.js";
//#region src/drag/drag.ts
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
/** Lock movement to a single axis by zeroing the other component. */
function constrainAxis(p, axis) {
	const out = {
		x: p.x,
		y: p.y
	};
	constrainAxisInPlace(out, axis);
	return out;
}
/** Snap each component to the nearest grid step. A step of 0 leaves that axis free. */
function constrainGrid(p, grid) {
	const out = {
		x: p.x,
		y: p.y
	};
	constrainGridInPlace(out, grid);
	return out;
}
/**
* Clamp the proposed offset so the element — at `start_rect` translated by the offset —
* stays inside `bounds`. If the element is larger than the bounds on an axis it pins to
* the start edge (deterministic) rather than producing NaN/invalid clamps.
*/
function constrainBounds(p, start_rect, bounds) {
	const out = {
		x: p.x,
		y: p.y
	};
	constrainBoundsInPlace(out, start_rect, bounds);
	return out;
}
/**
* Run the tier-1 constraint pipeline in a deterministic order: axis → grid → bounds.
* Order matters — axis first (so a locked axis can't be re-introduced by grid/bounds),
* grid before bounds (so the snapped position is what gets clamped into range).
*/
function constrain(proposed, opts, start_rect) {
	const out = {
		x: proposed.x,
		y: proposed.y
	};
	constrainInPlace(out, opts, start_rect);
	return out;
}
/** Lock to one axis, writing the result into `out` (no alloc). */
function constrainAxisInPlace(out, axis) {
	if (axis === "x") out.y = 0;
	else if (axis === "y") out.x = 0;
}
/** Snap each component to the nearest grid step, in place (no alloc). */
function constrainGridInPlace(out, grid) {
	const [gx, gy] = grid;
	if (gx > 0) out.x = Math.round(out.x / gx) * gx;
	if (gy > 0) out.y = Math.round(out.y / gy) * gy;
}
/** Clamp `out` inside `bounds` (anchored at `start_rect`), in place (no alloc). */
function constrainBoundsInPlace(out, start_rect, bounds) {
	const min_x = bounds.left - start_rect.left;
	const max_x = bounds.right - start_rect.right;
	const min_y = bounds.top - start_rect.top;
	const max_y = bounds.bottom - start_rect.bottom;
	out.x = max_x >= min_x ? clamp(out.x, min_x, max_x) : min_x;
	out.y = max_y >= min_y ? clamp(out.y, min_y, max_y) : min_y;
}
/** In-place pipeline (axis → grid → bounds) over `out`, matching `constrain` exactly. */
function constrainInPlace(out, opts, start_rect) {
	if (opts.axis && opts.axis !== "both") constrainAxisInPlace(out, opts.axis);
	if (opts.grid) constrainGridInPlace(out, opts.grid);
	if (opts.bounds && start_rect) constrainBoundsInPlace(out, start_rect, opts.bounds);
}
/**
* Pointer→offset math with inverse-scale compensation (issue #232).
*
* `inverse_scale` is computed ONCE at drag-start (`scaleFromStart` below) and reused for
* every move — fixing the latent bug where the old engine recalculated it per-move and
* drifted under transformed ancestors at large coordinates.
*/
/** The anchor captured at drag-start: where the pointer "is" in unscaled element space. */
function dragAnchor(clientX, clientY, start_offset, inverse_scale) {
	return {
		x: clientX - start_offset.x / inverse_scale,
		y: clientY - start_offset.y / inverse_scale
	};
}
/** The proposed offset for the current pointer position, given the start anchor + scale. */
function proposedOffset(clientX, clientY, anchor, inverse_scale) {
	const out = {
		x: 0,
		y: 0
	};
	proposedOffsetInto(out, clientX, clientY, anchor, inverse_scale);
	return out;
}
/** Allocation-free twin of `proposedOffset` — writes into `out` for the hot move() path. */
function proposedOffsetInto(out, clientX, clientY, anchor, inverse_scale) {
	out.x = (clientX - anchor.x) * inverse_scale;
	out.y = (clientY - anchor.y) * inverse_scale;
}
const DRAG_MARKER = "data-neodrag-dragging";
function rectOf(node) {
	return node.getBoundingClientRect();
}
function eventPath(input) {
	if (isPointerInput(input)) return input.native.composedPath();
	return input.target ? [input.target] : [];
}
function insetRect(rect, p) {
	const pad = typeof p === "number" ? {
		top: p,
		right: p,
		bottom: p,
		left: p
	} : p;
	return {
		left: rect.left + (pad.left ?? 0),
		top: rect.top + (pad.top ?? 0),
		right: rect.right - (pad.right ?? 0),
		bottom: rect.bottom - (pad.bottom ?? 0)
	};
}
function resolveBoundsTarget(target, node) {
	if (target === "parent") {
		const parent = node.parentElement;
		return parent ? parent.getBoundingClientRect() : void 0;
	}
	if (target === "viewport") return {
		left: 0,
		top: 0,
		right: window.innerWidth,
		bottom: window.innerHeight
	};
	if (typeof target === "function") return target(node);
	if (target instanceof HTMLElement) return target.getBoundingClientRect();
	return target;
}
function resolveBounds(bounds, node) {
	if (!bounds) return void 0;
	if (typeof bounds === "object" && !(bounds instanceof HTMLElement) && "target" in bounds) {
		const base = resolveBoundsTarget(bounds.target, node);
		return base ? insetRect(base, bounds.padding ?? 0) : void 0;
	}
	return resolveBoundsTarget(bounds, node);
}
/** The `touch-action` value to apply, or null to leave it alone. Axis-aware by default. */
function resolveTouchAction(options) {
	if (options.touchAction === false) return null;
	if (typeof options.touchAction === "string") return options.touchAction;
	const axis = options.axis;
	return axis === "x" ? "pan-y" : axis === "y" ? "pan-x" : "none";
}
/** Apply (or restore) the node's `touch-action` per the current options. Idempotent. */
function applyTouchAction(state) {
	const node = state.node;
	if (!node.style) return;
	const value = resolveTouchAction(state.options);
	if (value === null) {
		if (state.saved_touch_action !== null) {
			node.style.touchAction = state.saved_touch_action;
			state.saved_touch_action = null;
		}
		return;
	}
	if (state.saved_touch_action === null) state.saved_touch_action = node.style.touchAction;
	node.style.touchAction = value;
}
/** Per-binding drag state. A class per the codebase convention. */
var DragState = class {
	node;
	options;
	offset;
	anchor = {
		x: 0,
		y: 0
	};
	inverse_scale = 1;
	start_rect = null;
	bounds;
	dragging = false;
	/** The node's original inline `touch-action`, saved when we override it (restored on destroy). */
	saved_touch_action = null;
	/** Reused scratch for the per-move proposed offset (before constraints write over it). */
	proposed = {
		x: 0,
		y: 0
	};
	/**
	* Stable constraint-options object handed to the in-place pipeline each move. Rebuilt in
	* `start()` (and never per-move) so the hot path doesn't allocate the `{axis,grid,bounds}`
	* literal every frame. `bounds` is refreshed each move below when it's a live thunk.
	*/
	constrain_opts = {};
	/** Auto target id — peer-local; `targetId` prefers `options.id`. */
	auto_target_id = autoId("drag");
	commit_subscribers = /* @__PURE__ */ new Set();
	presence_subscribers = /* @__PURE__ */ new Set();
	/** The peer whose remote drag is currently rendered over this node, or null. */
	remote_peer = null;
	/** A remote op that arrived while a local drag owned the node — applied on end if the local
	* gesture produced no commit, so a suppressed remote value isn't lost. */
	pending_remote = null;
	/** The offset captured at drag-start — `end` only commits when the offset actually changed. */
	start_offset = {
		x: 0,
		y: 0
	};
	/** Registered drag handles / cancel zones (node → priority). The start-gate walks the pointer's
	* `composedPath` against these: the innermost registered marker wins (priority overrides the
	* nesting), `handle` ⇒ allow, `cancel` ⇒ block. Empty `handles` ⇒ the whole node drags. */
	handles = /* @__PURE__ */ new Map();
	cancels = /* @__PURE__ */ new Map();
	constructor(node, options) {
		this.node = node;
		this.options = options;
		this.offset = options.position ? { ...options.position } : {
			x: 0,
			y: 0
		};
	}
	get targetId() {
		return this.options.id ?? this.auto_target_id;
	}
	get hasExplicitId() {
		return this.options.id != null;
	}
	event(input) {
		return {
			offset: {
				x: this.offset.x,
				y: this.offset.y
			},
			node: this.node,
			input
		};
	}
};
/** Eased transition for remote-driven translate (commit glide + presence smoothing). */
const REMOTE_DRAG_EASE = "translate 140ms ease-out";
/** Handle returned from `Drag.bind` — fine-grained `update()` + `destroy()`. */
var DragHandle = class {
	#drag;
	#state;
	constructor(drag, state) {
		this.#drag = drag;
		this.#state = state;
	}
	/** Targeted, fine-grained update — only the provided keys are written. */
	update(options) {
		Object.assign(this.#state.options, options);
		if (options.position && !this.#state.dragging) {
			this.#state.offset = { ...options.position };
			applyTranslate(this.#state.node, this.#state.offset.x, this.#state.offset.y, TRANSLATE_DRAG);
		}
		if ("touchAction" in options || "axis" in options) applyTouchAction(this.#state);
	}
	/**
	* Register a descendant as a drag **handle** — once any handle exists, a drag may start only from
	* inside one. `priority` overrides the innermost-wins nesting cascade when zones overlap on the
	* pointer's path. Returns an idempotent disposer that unregisters only this node.
	*/
	registerHandle(node, opts) {
		this.#state.handles.set(node, opts?.priority ?? 0);
		return () => {
			this.#state.handles.delete(node);
		};
	}
	/**
	* Register a descendant as a **cancel** zone — a drag may never start from inside it. `priority`
	* overrides the nesting cascade. Returns an idempotent disposer that unregisters only this node.
	*/
	registerCancel(node, opts) {
		this.#state.cancels.set(node, opts?.priority ?? 0);
		return () => {
			this.#state.cancels.delete(node);
		};
	}
	get offset() {
		return this.#state.offset;
	}
	get isDragging() {
		return this.#state.dragging;
	}
	/** The draggable's stable string id — the `target` in the unified op grammar. */
	get targetId() {
		return this.#state.targetId;
	}
	/** Whether `targetId` came from an explicit `id` option (auto ids are peer-local). */
	get hasExplicitId() {
		return this.#state.hasExplicitId;
	}
	onCommit(fn) {
		this.#state.commit_subscribers.add(fn);
		return () => this.#state.commit_subscribers.delete(fn);
	}
	onPresence(fn) {
		this.#state.presence_subscribers.add(fn);
		return () => this.#state.presence_subscribers.delete(fn);
	}
	/** Apply a remote drag fact — translates the node to the committed offset (eased). Foreign kinds
	* ignored — this is the unified `CollabTarget.applyExternal`. */
	applyExternal(op) {
		if (op.type === "drag") this.#drag.applyExternal(this.#state, op);
	}
	showRemotePresence(frame) {
		if (frame.type === "drag") this.#drag.showRemotePresence(this.#state, frame);
	}
	clearRemotePresence(peerId) {
		this.#drag.clearRemotePresence(this.#state, peerId);
	}
	destroy() {
		this.#drag._unbind(this.#state.node);
		clearTranslate(this.#state.node, TRANSLATE_DRAG);
		this.#state.node.removeAttribute(DRAG_MARKER);
		if (this.#state.saved_touch_action !== null) this.#state.node.style.touchAction = this.#state.saved_touch_action;
	}
};
const DRAG_KEY = Symbol("neodrag.drag");
/**
* The drag capability. Options-only: the common constraints are inlined pure transforms
* (no plugin objects). Owns its own node registry and claims pointerdowns that land on a
* bound node (respecting handle/cancel/disabled).
*/
var Drag = class {
	key = DRAG_KEY;
	name = "drag";
	priority = 0;
	#nodes = /* @__PURE__ */ new Map();
	#settleRaf = null;
	bind(node, options = {}) {
		const state = new DragState(node, options);
		if (options.onCommit && options.id == null) warnOnce("drag:id", "this draggable uses onCommit but has no `id` — auto ids are peer-local and will not match across collaborating clients. Give it a stable `id`.");
		this.#nodes.set(node, state);
		if (options.position) applyTranslate(node, state.offset.x, state.offset.y, TRANSLATE_DRAG);
		applyTouchAction(state);
		return new DragHandle(this, state);
	}
	/** @internal */
	_unbind(node) {
		this.#nodes.delete(node);
	}
	resolve(input) {
		const node = this.#findNode(input);
		if (!node) return null;
		const state = this.#nodes.get(node);
		if (state.options.disabled) return null;
		if (!this.#allowed(state, input)) return null;
		return {
			node,
			data: state
		};
	}
	shouldStart(session) {
		const threshold = session.target.data.options.threshold ?? 0;
		if (threshold <= 0) return true;
		const dx = session.input.clientX - session.startInput.clientX;
		const dy = session.input.clientY - session.startInput.clientY;
		return dx * dx + dy * dy >= threshold * threshold;
	}
	start(session) {
		const state = session.target.data;
		const rect = rectOf(state.node);
		state.inverse_scale = inverseScaleFromNode(state.node, rect);
		const off = state.offset;
		state.start_rect = {
			left: rect.left - off.x,
			top: rect.top - off.y,
			right: rect.right - off.x,
			bottom: rect.bottom - off.y,
			width: rect.width,
			height: rect.height,
			x: rect.left - off.x,
			y: rect.top - off.y,
			toJSON() {}
		};
		state.anchor = dragAnchor(session.startInput.clientX, session.startInput.clientY, state.offset, state.inverse_scale);
		state.bounds = resolveBounds(state.options.bounds, state.node);
		state.dragging = true;
		state.start_offset.x = state.offset.x;
		state.start_offset.y = state.offset.y;
		if (state.node instanceof HTMLElement && state.node.style) state.node.style.transition = "";
		if (state.options.userSelect === false) session.userSelect = false;
		session.data = state.options.dragData;
		state.node.setAttribute(DRAG_MARKER, "");
		const ev = state.event(session.input);
		if (state.options.use) for (const p of state.options.use) p.onStart?.(ev);
		state.options.onDragStart?.(ev);
	}
	move(session) {
		const state = session.target.data;
		this.#cancelSettle();
		this.#applyMove(state, session.input);
		this.#scheduleSettle(state, session.input);
		this.#pumpPresence(state);
	}
	/** The offset → constrain → `use`-plugin → translate pipeline for one input frame. */
	#applyMove(state, input) {
		const proposed = state.proposed;
		proposedOffsetInto(proposed, input.clientX, input.clientY, state.anchor, state.inverse_scale);
		const opts = state.constrain_opts;
		opts.axis = state.options.axis;
		opts.grid = state.options.grid;
		opts.bounds = state.bounds;
		constrainInPlace(proposed, opts, state.start_rect ?? void 0);
		if (state.options.use) for (const p of state.options.use) {
			const adjusted = p.onMove?.({
				offset: proposed,
				node: state.node,
				input
			});
			if (adjusted) {
				proposed.x = adjusted.x;
				proposed.y = adjusted.y;
			}
		}
		const offset = state.offset;
		offset.x = proposed.x;
		offset.y = proposed.y;
		applyTranslate(state.node, offset.x, offset.y, TRANSLATE_DRAG);
		if (state.options.onDrag) state.options.onDrag(state.event(input));
	}
	#cancelSettle() {
		if (this.#settleRaf != null) {
			cancelAnimationFrame(this.#settleRaf);
			this.#settleRaf = null;
		}
	}
	#scheduleSettle(state, input) {
		if (typeof requestAnimationFrame === "undefined") return;
		if (!state.options.use?.some((p) => p.animating?.())) return;
		this.#settleRaf = requestAnimationFrame(() => {
			this.#settleRaf = null;
			if (!state.dragging) return;
			this.#applyMove(state, input);
			this.#scheduleSettle(state, input);
		});
	}
	end(session, _reason) {
		const state = session.target.data;
		this.#cancelSettle();
		state.dragging = false;
		state.node.removeAttribute(DRAG_MARKER);
		const ev = state.event(session.input);
		if (state.options.use) for (const p of state.options.use) p.onEnd?.(ev);
		state.options.onDragEnd?.(ev);
		if (state.offset.x !== state.start_offset.x || state.offset.y !== state.start_offset.y) {
			this.#emitCommit(state, {
				type: "drag",
				target: state.targetId,
				x: state.offset.x,
				y: state.offset.y
			});
			state.pending_remote = null;
		} else if (state.pending_remote) this.applyExternal(state, state.pending_remote);
		for (const fn of state.presence_subscribers) fn(null);
	}
	#emitCommit(state, op) {
		state.options.onCommit?.(op);
		for (const fn of state.commit_subscribers) fn(op);
	}
	#pumpPresence(state) {
		if (state.presence_subscribers.size === 0) return;
		const frame = {
			type: "drag",
			target: state.targetId,
			x: state.offset.x,
			y: state.offset.y
		};
		for (const fn of state.presence_subscribers) fn(frame);
	}
	/** Apply a remote drag fact — translate to the committed offset, eased. A no-op while a local drag
	*  owns the node (stashed, applied on end if the local gesture commits nothing). */
	applyExternal(state, op) {
		if (state.dragging) {
			state.pending_remote = op;
			return;
		}
		state.pending_remote = null;
		state.offset = {
			x: op.x,
			y: op.y
		};
		if (state.node instanceof HTMLElement && state.node.style) state.node.style.transition = REMOTE_DRAG_EASE;
		applyTranslate(state.node, op.x, op.y, TRANSLATE_DRAG);
	}
	showRemotePresence(state, frame) {
		if (state.dragging) return;
		state.remote_peer = frame.peerId;
		if (state.node instanceof HTMLElement && state.node.style) state.node.style.transition = REMOTE_DRAG_EASE;
		applyTranslate(state.node, frame.x, frame.y, TRANSLATE_DRAG);
	}
	clearRemotePresence(state, peerId) {
		if (peerId && state.remote_peer !== peerId) return;
		state.remote_peer = null;
		if (state.dragging) return;
		if (state.node instanceof HTMLElement && state.node.style) state.node.style.transition = REMOTE_DRAG_EASE;
		applyTranslate(state.node, state.offset.x, state.offset.y, TRANSLATE_DRAG);
	}
	#findNode(input) {
		for (const el of eventPath(input)) {
			if ((el instanceof HTMLElement || el instanceof SVGElement) && this.#nodes.has(el)) return el;
			if (el === document) break;
		}
		return null;
	}
	#allowed(state, input) {
		const { handles, cancels } = state;
		if (handles.size > 0 || cancels.size > 0) {
			let kind = null;
			let best = -Infinity;
			for (const el of eventPath(input)) {
				const h = handles.get(el);
				if (h !== void 0 && h > best) {
					best = h;
					kind = "handle";
				}
				const c = cancels.get(el);
				if (c !== void 0 && c > best) {
					best = c;
					kind = "cancel";
				}
				if (el === state.node || el === document) break;
			}
			if (kind) return kind === "handle";
		}
		return handles.size === 0;
	}
};
//#endregion
//#region src/drag/draggable.ts
/**
* Ergonomic single-element class API: `new Draggable(node, options)`. Routes through the
* shared engine + `Drag` capability so importing only `Draggable` pulls in just the drag
* path (no drop/resize/sortable). Satisfies the unified {@link CollabTarget} seam, so
* `room.add(draggable)` works.
*/
var Draggable = class {
	#handle;
	constructor(node, options = {}) {
		this.#handle = sharedCapability(Drag, () => new Drag()).bind(node, options);
	}
	/** Targeted, fine-grained update — only the provided keys are written. */
	update(options) {
		this.#handle.update(options);
	}
	get offset() {
		return this.#handle.offset;
	}
	get isDragging() {
		return this.#handle.isDragging;
	}
	/** Register a descendant as a drag **handle** — once any exist, a drag may start only from inside
	* one. `priority` overrides the innermost-wins nesting cascade. Returns an idempotent disposer. */
	registerHandle(node, opts) {
		return this.#handle.registerHandle(node, opts);
	}
	/** Register a descendant as a **cancel** zone — a drag may never start from inside it. Returns an
	* idempotent disposer. */
	registerCancel(node, opts) {
		return this.#handle.registerCancel(node, opts);
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
export { constrain as a, constrainGrid as c, DragState as i, dragAnchor as l, Drag as n, constrainAxis as o, DragHandle as r, constrainBounds as s, Draggable as t, proposedOffset as u };
