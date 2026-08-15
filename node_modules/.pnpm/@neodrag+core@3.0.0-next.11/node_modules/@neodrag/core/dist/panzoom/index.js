import { i as listen, t as autoId } from "../utils-BRN9X2Lx.js";
import { t as Draggable } from "../draggable-OC_p_tRg.js";
//#region src/panzoom/panzoom.ts
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
/**
* Framework-agnostic pan/zoom viewport math. Holds the world's `{ x, y, scale }` transform and the
* scale clamp, and keeps the point under the cursor fixed while zooming (the Figma/Miro move). It
* never touches the DOM — applying the transform to the world layer and wiring pan/wheel/pinch input
* is the wrapper's job. `x`/`y` are viewport-space px (pan is 1:1 with the pointer at any zoom);
* `transformString()` assumes the world layer has `transform-origin: 0 0`.
*/
var PanZoomController = class {
	x;
	y;
	scale;
	#min;
	#max;
	#initial;
	#on_change;
	#pan_start = null;
	#panning = false;
	#id;
	#auto_target_id = autoId("panzoom");
	#on_commit;
	#commit_subscribers = /* @__PURE__ */ new Set();
	#presence_subscribers = /* @__PURE__ */ new Set();
	constructor(options = {}) {
		this.#min = options.minScale ?? .1;
		this.#max = options.maxScale ?? 8;
		this.x = options.x ?? 0;
		this.y = options.y ?? 0;
		this.scale = clamp(options.scale ?? 1, this.#min, this.#max);
		this.#initial = {
			x: this.x,
			y: this.y,
			scale: this.scale
		};
		this.#on_change = options.onChange;
		this.#id = options.id;
		this.#on_commit = options.onCommit;
	}
	/** The viewport's stable string id — the `target` in the unified op grammar. */
	get targetId() {
		return this.#id ?? this.#auto_target_id;
	}
	get hasExplicitId() {
		return this.#id != null;
	}
	/** The current transform as a plain object. */
	get transform() {
		return {
			x: this.x,
			y: this.y,
			scale: this.scale
		};
	}
	/** A CSS `transform` value for the world layer (needs `transform-origin: 0 0`). */
	transformString() {
		return `translate(${this.x}px, ${this.y}px) scale(${this.scale})`;
	}
	/** Replace any subset of the transform (programmatic / controlled set) and sync it. */
	setTransform(t) {
		this.#apply(t);
		this.#commit();
	}
	/** Translate the world by `(dx, dy)` viewport px. */
	panBy(dx, dy) {
		this.#apply({
			x: this.x + dx,
			y: this.y + dy
		});
		this.#commit();
	}
	/**
	* Zoom to an absolute `scale`, keeping the viewport-local point `(cx, cy)` fixed on screen so the
	* content under the cursor doesn't drift. No-op once clamped against the scale bounds.
	*/
	zoomTo(scale, cx, cy) {
		const next = clamp(scale, this.#min, this.#max);
		if (next === this.scale) return;
		const wx = (cx - this.x) / this.scale;
		const wy = (cy - this.y) / this.scale;
		this.scale = next;
		this.x = cx - wx * next;
		this.y = cy - wy * next;
		this.#emit();
		this.#commit();
	}
	/** Multiply the scale by `factor`, keeping `(cx, cy)` fixed. */
	zoomBy(factor, cx, cy) {
		this.zoomTo(this.scale * factor, cx, cy);
	}
	/** Restore the initial transform. */
	reset() {
		this.setTransform({
			x: this.#initial.x,
			y: this.#initial.y,
			scale: this.#initial.scale
		});
	}
	/** Snapshot the translate at gesture start so the move is computed from a stable base. */
	beginPan() {
		this.#pan_start = {
			x: this.x,
			y: this.y
		};
		this.#panning = true;
	}
	/** Set the translate to the start plus the drag offset (viewport px). Streams live presence. */
	panTo(offsetX, offsetY) {
		if (!this.#pan_start) return;
		this.x = this.#pan_start.x + offsetX;
		this.y = this.#pan_start.y + offsetY;
		this.#emit();
		this.#pump_presence();
	}
	endPan() {
		this.#pan_start = null;
		this.#panning = false;
		this.#commit();
		for (const fn of this.#presence_subscribers) fn(null);
	}
	/** The Room only ever passes `{ id }`. */
	update(options) {
		if (options.id !== void 0) this.#id = options.id;
	}
	onCommit(fn) {
		this.#commit_subscribers.add(fn);
		return () => this.#commit_subscribers.delete(fn);
	}
	onPresence(fn) {
		this.#presence_subscribers.add(fn);
		return () => this.#presence_subscribers.delete(fn);
	}
	/** Apply a remote transform — last-write-wins. A no-op while a local pan owns the viewport (the
	*  local gesture wins). Foreign kinds ignored. */
	applyExternal(op) {
		if (op.type !== "panzoom" || this.#panning) return;
		this.#apply({
			x: op.x,
			y: op.y,
			scale: op.scale
		});
	}
	/** Render a remote peer's in-flight pan/zoom — set the live transform (no-op during a local pan). */
	showRemotePresence(frame) {
		if (frame.type !== "panzoom" || this.#panning) return;
		this.#apply({
			x: frame.x,
			y: frame.y,
			scale: frame.scale
		});
	}
	clearRemotePresence() {}
	/** Set state + fire `onChange` only — the path remote facts apply through, so it never re-emits a
	*  commit (no echo loop). Scale is clamped. */
	#apply(t) {
		if (t.x !== void 0) this.x = t.x;
		if (t.y !== void 0) this.y = t.y;
		if (t.scale !== void 0) this.scale = clamp(t.scale, this.#min, this.#max);
		this.#emit();
	}
	#commit() {
		const op = {
			type: "panzoom",
			target: this.targetId,
			x: this.x,
			y: this.y,
			scale: this.scale
		};
		this.#on_commit?.(op);
		for (const fn of this.#commit_subscribers) fn(op);
	}
	#pump_presence() {
		if (this.#presence_subscribers.size === 0) return;
		const frame = {
			type: "panzoom",
			target: this.targetId,
			x: this.x,
			y: this.y,
			scale: this.scale
		};
		for (const fn of this.#presence_subscribers) fn(frame);
	}
	#emit() {
		this.#on_change?.(this.transform);
	}
};
/**
* Drag plugin that pans a `PanZoomController`. The viewport is a `Draggable` running this plugin; on
* each move it feeds the drag offset to the controller (which translates the *world* layer) and
* returns `{ x: 0, y: 0 }` so the viewport element itself never translates — exactly the marquee
* pattern. Spread the viewport with `Draggable({ use: [pan(controller)] })`.
*/
function pan(controller) {
	return {
		name: "pan",
		onStart: () => controller.beginPan(),
		onMove: ({ offset }) => {
			controller.panTo(offset.x, offset.y);
			return {
				x: 0,
				y: 0
			};
		},
		onEnd: () => controller.endPan()
	};
}
/**
* Framework-agnostic, DOM-aware pan/zoom binder — the engine-built infinite canvas. The **viewport**
* is a `Draggable` running the `pan` plugin (drag empty space to pan) plus wheel and two-finger pinch
* zoom toward the cursor; the **world** layer is the only thing that transforms. Register the two
* elements with `viewport(el)` / `world(el)` (each returns a disposer, so they bind independently and
* in any order), and read the live transform from `scale` / `x` / `y`. Framework wrappers map the two
* register methods to refs/attachments and mirror `onChange` into reactive state; vanilla uses it
* directly.
*/
var PanZoom = class {
	#ctrl;
	#wheel_speed;
	#on_change;
	#room;
	#id;
	#room_off = null;
	#viewport = null;
	#world = null;
	#drag = null;
	#pointers = /* @__PURE__ */ new Map();
	#pinch_dist = 0;
	constructor(options = {}) {
		this.#wheel_speed = options.wheelSpeed ?? .0015;
		this.#on_change = options.onChange;
		this.#room = options.room;
		this.#id = options.id;
		this.#ctrl = new PanZoomController({
			...options,
			onChange: (t) => {
				this.#apply_world();
				this.#on_change?.(t);
			}
		});
	}
	/** The underlying collab target — its transform syncs across a room. */
	get target() {
		return this.#ctrl;
	}
	get scale() {
		return this.#ctrl.scale;
	}
	get x() {
		return this.#ctrl.x;
	}
	get y() {
		return this.#ctrl.y;
	}
	get transform() {
		return this.#ctrl.transform;
	}
	/** Register the clipping viewport element. Returns a disposer. */
	viewport(el) {
		this.#viewport = el;
		el.style.overflow = "hidden";
		el.style.touchAction = "none";
		if (!el.style.position) el.style.position = "relative";
		this.#drag = new Draggable(el, { use: [pan(this.#ctrl)] });
		const unlisten = [
			listen(el, "wheel", this.#on_wheel, { passive: false }),
			listen(el, "pointerdown", this.#on_pointer_down),
			listen(el, "pointermove", this.#on_pointer_move),
			listen(el, "pointerup", this.#on_pointer_up),
			listen(el, "pointercancel", this.#on_pointer_up)
		];
		if (this.#room) this.#room_off = this.#room.add(this.#ctrl, this.#id);
		return () => {
			for (const off of unlisten) off();
			this.#room_off?.();
			this.#room_off = null;
			this.#drag?.destroy();
			this.#drag = null;
			this.#pointers.clear();
			if (this.#viewport === el) this.#viewport = null;
		};
	}
	/** Register the inner content layer that pans and zooms. Returns a disposer. */
	world(el) {
		this.#world = el;
		el.style.transformOrigin = "0 0";
		this.#apply_world();
		return () => {
			if (this.#world === el) this.#world = null;
		};
	}
	/** Multiply the scale by `factor`, keeping `(cx, cy)` viewport-local fixed (default: centre). */
	zoomBy(factor, cx, cy) {
		const c = this.#focus(cx, cy);
		this.#ctrl.zoomBy(factor, c.x, c.y);
	}
	/** Zoom to an absolute scale, keeping `(cx, cy)` viewport-local fixed (default: centre). */
	zoomTo(scale, cx, cy) {
		const c = this.#focus(cx, cy);
		this.#ctrl.zoomTo(scale, c.x, c.y);
	}
	panBy(dx, dy) {
		this.#ctrl.panBy(dx, dy);
	}
	setTransform(t) {
		this.#ctrl.setTransform(t);
	}
	reset() {
		this.#ctrl.reset();
	}
	#apply_world() {
		if (this.#world) this.#world.style.transform = this.#ctrl.transformString();
	}
	#local(clientX, clientY) {
		const r = this.#viewport.getBoundingClientRect();
		return {
			x: clientX - r.left,
			y: clientY - r.top
		};
	}
	#focus(cx, cy) {
		if (cx !== void 0 && cy !== void 0) return {
			x: cx,
			y: cy
		};
		if (this.#viewport) {
			const r = this.#viewport.getBoundingClientRect();
			return {
				x: r.width / 2,
				y: r.height / 2
			};
		}
		return {
			x: 0,
			y: 0
		};
	}
	#on_wheel = (e) => {
		if (!this.#viewport) return;
		e.preventDefault();
		const { x, y } = this.#local(e.clientX, e.clientY);
		this.#ctrl.zoomBy(Math.exp(-e.deltaY * this.#wheel_speed), x, y);
	};
	#on_pointer_down = (e) => {
		this.#pointers.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY
		});
		if (this.#pointers.size === 2) this.#pinch_dist = this.#dist();
	};
	#on_pointer_move = (e) => {
		if (!this.#pointers.has(e.pointerId)) return;
		this.#pointers.set(e.pointerId, {
			x: e.clientX,
			y: e.clientY
		});
		if (this.#pointers.size !== 2 || !this.#viewport) return;
		const d = this.#dist();
		if (this.#pinch_dist > 0) {
			const [a, b] = [...this.#pointers.values()];
			const mid = this.#local((a.x + b.x) / 2, (a.y + b.y) / 2);
			this.#ctrl.zoomBy(d / this.#pinch_dist, mid.x, mid.y);
		}
		this.#pinch_dist = d;
	};
	#on_pointer_up = (e) => {
		this.#pointers.delete(e.pointerId);
		if (this.#pointers.size < 2) this.#pinch_dist = 0;
	};
	#dist() {
		const [a, b] = [...this.#pointers.values()];
		return Math.hypot(a.x - b.x, a.y - b.y);
	}
};
//#endregion
export { PanZoom, PanZoomController, pan };
