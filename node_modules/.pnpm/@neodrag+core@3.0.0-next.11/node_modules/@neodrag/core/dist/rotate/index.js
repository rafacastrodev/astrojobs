import { isPointerInput } from "../interaction/index.js";
import { n as is_svg_element, o as warnOnce, t as autoId } from "../utils-BRN9X2Lx.js";
import { t as sharedCapability } from "../shared-5VBBgXhD.js";
import { t as inverseScaleFromNode } from "../inverse-scale-BCb2f85l.js";
//#region src/rotate/rotate.ts
const ROTATE_HANDLE_ATTR = "data-neodrag-rotate-handle";
/** Eased transition for remote-driven rotation (commit glide + presence smoothing). */
const REMOTE_ROTATE_EASE = "rotate 140ms ease-out";
/** Normalize the configured angle: snap to `step`, then clamp to `[min, max]`. Pure for testing. */
function normalizeAngle(angle, opts) {
	let a = angle;
	if (opts.step && opts.step > 0) a = Math.round(a / opts.step) * opts.step;
	if (opts.min != null) a = Math.max(opts.min, a);
	if (opts.max != null) a = Math.min(opts.max, a);
	return a;
}
/** The pivot point in viewport coords for a given origin + element rect. Pure for testing. */
function pivotPoint(origin, rect) {
	if (origin === "center") return {
		x: (rect.left + rect.right) / 2,
		y: (rect.top + rect.bottom) / 2
	};
	if (origin === "tl") return {
		x: rect.left,
		y: rect.top
	};
	if (origin === "tr") return {
		x: rect.right,
		y: rect.top
	};
	if (origin === "bl") return {
		x: rect.left,
		y: rect.bottom
	};
	if (origin === "br") return {
		x: rect.right,
		y: rect.bottom
	};
	return {
		x: rect.left + origin.x,
		y: rect.top + origin.y
	};
}
/** The CSS `transform-origin` keyword/offset matching a {@link RotateOrigin}. */
function originCss(origin) {
	if (origin === "center") return "center";
	if (origin === "tl") return "left top";
	if (origin === "tr") return "right top";
	if (origin === "bl") return "left bottom";
	if (origin === "br") return "right bottom";
	return `${origin.x}px ${origin.y}px`;
}
/** Read the element's current rotation (degrees) from the individual `rotate` property / transform. */
function readAngle(node) {
	if (is_svg_element(node)) {
		const m = (node.getAttribute("transform") ?? "").match(/rotate\(\s*(-?[\d.]+)/);
		return m ? parseFloat(m[1]) : 0;
	}
	const r = node.style.rotate;
	if (r) {
		const m = r.match(/(-?[\d.]+)deg/);
		if (m) return parseFloat(m[1]);
	}
	return 0;
}
/** Apply a rotation (degrees) around `origin`. HTML uses the individual `rotate` property (composes
*  with drag's `translate` and resize's width/height); SVG merges a `rotate(a cx cy)` into transform. */
function applyAngle(node, angle, origin, pivot) {
	if (is_svg_element(node)) {
		const rect = node.getBoundingClientRect();
		const cx = pivot.x - rect.left;
		const cy = pivot.y - rect.top;
		const base = (node.getAttribute("transform") ?? "").replace(/\s*rotate\([^)]*\)/, "").trim();
		node.setAttribute("transform", `${base} rotate(${angle} ${cx} ${cy})`.trim());
		return;
	}
	const el = node;
	el.style.transformOrigin = originCss(origin);
	el.style.rotate = `${angle}deg`;
}
var RotateState = class {
	node;
	options;
	angle = 0;
	initial_angle = 0;
	center = {
		x: 0,
		y: 0
	};
	initial_pointer_angle = 0;
	inverse_scale = 1;
	/** True while a local rotate gesture owns the node — remote applies defer to it. */
	rotating = false;
	/** Auto target id — peer-local; `targetId` prefers `options.id`. */
	auto_target_id = autoId("rotate");
	commit_subscribers = /* @__PURE__ */ new Set();
	presence_subscribers = /* @__PURE__ */ new Set();
	/** The peer whose remote rotation is currently rendered over this node, or null. */
	remote_peer = null;
	/** A remote op that arrived while a local rotate owned the node — applied on end if the local
	* gesture produced no commit, so a suppressed remote value isn't lost. */
	pending_remote = null;
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
	event(input) {
		return {
			angle: this.angle,
			node: this.node,
			input
		};
	}
};
var RotateHandle = class {
	#rotate;
	#state;
	constructor(rotate, state) {
		this.#rotate = rotate;
		this.#state = state;
	}
	update(options) {
		const s = this.#state;
		Object.assign(s.options, options);
		if (!s.rotating && options.angle !== void 0) this.#rotate._applyControlledAngle(s, options.angle);
	}
	/** The current angle in degrees. */
	get angle() {
		return this.#state.angle;
	}
	/** The rotatable's stable string id — the `target` in the unified op grammar. */
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
	/** Apply a remote rotate fact — turns the node to the committed angle (eased). Foreign kinds
	* ignored — this is the unified `CollabTarget.applyExternal`. */
	applyExternal(op) {
		if (op.type === "rotate") this.#rotate.applyExternal(this.#state, op);
	}
	showRemotePresence(frame) {
		if (frame.type === "rotate") this.#rotate.showRemotePresence(this.#state, frame);
	}
	clearRemotePresence(peerId) {
		this.#rotate.clearRemotePresence(this.#state, peerId);
	}
	destroy() {
		this.#rotate._unbind(this.#state.node);
	}
};
const ROTATE_KEY = Symbol("neodrag.rotate");
/**
* The rotate capability. Claims pointerdowns that land on a rotate handle element
* (`data-neodrag-rotate-handle`), at a higher priority than resize so a grip wins over an
* overlapping resize edge. Writes the individual CSS `rotate` property (HTML) so it composes with
* drag's `translate` and resize's size on the same element.
*/
var Rotate = class {
	key = ROTATE_KEY;
	name = "rotate";
	priority = 110;
	#nodes = /* @__PURE__ */ new Map();
	bind(node, options = {}) {
		const state = new RotateState(node, options);
		if (options.onCommit && options.id == null) warnOnce("rotate:id", "this rotatable uses onCommit but has no `id` — auto ids are peer-local and will not match across collaborating clients. Give it a stable `id`.");
		this.#nodes.set(node, state);
		if (options.angle !== void 0) this._applyControlledAngle(state, options.angle);
		return new RotateHandle(this, state);
	}
	/** @internal */
	_unbind(node) {
		this.#nodes.delete(node);
	}
	/** @internal Apply a controlled angle (snapped/clamped via `step`/`min`/`max`) outside a gesture. */
	_applyControlledAngle(state, angle) {
		const normalized = normalizeAngle(angle, state.options);
		if (normalized === state.angle) return;
		state.angle = normalized;
		applyAngle(state.node, normalized, state.options.origin ?? "center", this.#pivotFor(state));
	}
	resolve(input) {
		const node = this.#findHandle(input);
		if (!node) return null;
		const state = this.#nodes.get(node);
		if (state.options.disabled) return null;
		return {
			node,
			data: state
		};
	}
	start(session) {
		const state = session.target.data;
		const rect = state.node.getBoundingClientRect();
		state.inverse_scale = inverseScaleFromNode(state.node, rect);
		state.center = pivotPoint(state.options.origin ?? "center", {
			left: rect.left,
			top: rect.top,
			right: rect.right,
			bottom: rect.bottom
		});
		state.initial_angle = state.angle = readAngle(state.node);
		state.initial_pointer_angle = Math.atan2(session.startInput.clientY - state.center.y, session.startInput.clientX - state.center.x);
		state.rotating = true;
		if (state.node instanceof HTMLElement && state.node.style) state.node.style.transition = "";
		if (state.options.userSelect === false) session.userSelect = false;
		state.options.onRotateStart?.(state.event(session.input));
	}
	move(session) {
		const state = session.target.data;
		const delta_deg = (Math.atan2(session.input.clientY - state.center.y, session.input.clientX - state.center.x) - state.initial_pointer_angle) * 180 / Math.PI;
		state.angle = normalizeAngle(state.initial_angle + delta_deg, state.options);
		applyAngle(state.node, state.angle, state.options.origin ?? "center", state.center);
		state.options.onRotate?.(state.event(session.input));
		this.#pumpPresence(state);
	}
	end(session, _reason) {
		const state = session.target.data;
		state.rotating = false;
		state.options.onRotateEnd?.(state.event(session.input));
		if (state.angle !== state.initial_angle) {
			this.#emitCommit(state, {
				type: "rotate",
				target: state.targetId,
				angle: state.angle
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
			type: "rotate",
			target: state.targetId,
			angle: state.angle
		};
		for (const fn of state.presence_subscribers) fn(frame);
	}
	/** Apply a remote rotate fact — set the angle and glide there. A no-op while a local rotate owns
	*  the node (stashed, applied on end if the local gesture commits nothing). */
	applyExternal(state, op) {
		if (state.rotating) {
			state.pending_remote = op;
			return;
		}
		state.pending_remote = null;
		state.angle = op.angle;
		const node = state.node;
		if (node instanceof HTMLElement && node.style) node.style.transition = REMOTE_ROTATE_EASE;
		applyAngle(node, op.angle, state.options.origin ?? "center", this.#pivotFor(state));
	}
	showRemotePresence(state, frame) {
		if (state.rotating) return;
		state.remote_peer = frame.peerId;
		const node = state.node;
		if (node instanceof HTMLElement && node.style) node.style.transition = REMOTE_ROTATE_EASE;
		applyAngle(node, frame.angle, state.options.origin ?? "center", this.#pivotFor(state));
	}
	clearRemotePresence(state, peerId) {
		if (peerId && state.remote_peer !== peerId) return;
		state.remote_peer = null;
		if (state.rotating) return;
		const node = state.node;
		if (node instanceof HTMLElement && node.style) node.style.transition = REMOTE_ROTATE_EASE;
		applyAngle(node, state.angle, state.options.origin ?? "center", this.#pivotFor(state));
	}
	/** The pivot in viewport coords for the current layout (remote applies happen outside a gesture,
	*  so `state.center` may be stale — recompute from the live rect). */
	#pivotFor(state) {
		const rect = state.node.getBoundingClientRect();
		return pivotPoint(state.options.origin ?? "center", {
			left: rect.left,
			top: rect.top,
			right: rect.right,
			bottom: rect.bottom
		});
	}
	#findHandle(input) {
		const path = isPointerInput(input) ? input.native.composedPath() : input.target ? [input.target] : [];
		for (const el of path) {
			if (!(el instanceof HTMLElement)) {
				if (el === document) break;
				continue;
			}
			if (el.getAttribute("data-neodrag-rotate-handle") == null) continue;
			let owner = el;
			while (owner) {
				if (this.#nodes.has(owner)) return owner;
				owner = owner.parentElement;
			}
		}
		return null;
	}
};
//#endregion
//#region src/rotate/rotatable.ts
/** Ergonomic single-element rotate: `new Rotatable(node, options)`. Satisfies the unified
* {@link CollabTarget} seam, so `room.add(rotatable)` works. */
var Rotatable = class {
	#handle;
	constructor(node, options = {}) {
		this.#handle = sharedCapability(Rotate, () => new Rotate()).bind(node, options);
	}
	/** Targeted, fine-grained update — only the provided keys are written. */
	update(options) {
		this.#handle.update(options);
	}
	/** The current angle in degrees. */
	get angle() {
		return this.#handle.angle;
	}
	/** The rotatable's stable string id — the `target` in the unified collab op grammar. */
	get targetId() {
		return this.#handle.targetId;
	}
	/** Whether `targetId` came from an explicit `id` option (auto ids are peer-local). */
	get hasExplicitId() {
		return this.#handle.hasExplicitId;
	}
	/** Subscribe to committed ops (additive — composes with `options.onCommit`). */
	onCommit(fn) {
		return this.#handle.onCommit(fn);
	}
	/** Subscribe to in-flight presence (`null` = rotate ended). */
	onPresence(fn) {
		return this.#handle.onPresence(fn);
	}
	/** Apply a remote rotate fact — spins the node to the committed angle (eased). Foreign kinds ignored. */
	applyExternal(op) {
		this.#handle.applyExternal(op);
	}
	/** Render a remote peer's in-flight rotation over this node (live eased angle). */
	showRemotePresence(frame) {
		this.#handle.showRemotePresence(frame);
	}
	/** Clear a peer's remote presence, easing back to the committed angle. */
	clearRemotePresence(peerId) {
		this.#handle.clearRemotePresence(peerId);
	}
	destroy() {
		this.#handle.destroy();
	}
};
//#endregion
export { ROTATE_HANDLE_ATTR, Rotatable, Rotate, RotateHandle, RotateState, normalizeAngle, pivotPoint };
