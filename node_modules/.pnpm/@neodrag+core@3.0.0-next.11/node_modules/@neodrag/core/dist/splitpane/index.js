import { t as autoId } from "../utils-BRN9X2Lx.js";
import { t as Draggable } from "../draggable-OC_p_tRg.js";
//#region src/splitpane/splitpane.ts
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
/**
* Framework-agnostic split-pane math. Holds the pane weights and redistributes a conserved budget
* between two neighbours when a gutter is dragged — one grows by exactly what the other loses,
* each clamped to its minimum. The DOM (applying `flex` to panes, making gutters draggable) is the
* wrapper's job; this class never touches it.
*/
var SplitPaneController = class {
	axis;
	sizes;
	#min;
	#start = null;
	#dragging = false;
	#on_resize;
	#on_change;
	#id;
	#auto_target_id = autoId("splitpane");
	#on_commit;
	#commit_subscribers = /* @__PURE__ */ new Set();
	#presence_subscribers = /* @__PURE__ */ new Set();
	constructor(options = {}) {
		this.axis = options.axis ?? "x";
		this.sizes = options.sizes ? options.sizes.slice() : [];
		this.#min = this.#resolve_min(options.minSizes, this.sizes.length);
		this.#id = options.id;
		this.#on_resize = options.onResize;
		this.#on_change = options.onChange;
		this.#on_commit = options.onCommit;
	}
	/** The split's stable string id — the `target` in the unified op grammar. */
	get targetId() {
		return this.#id ?? this.#auto_target_id;
	}
	get hasExplicitId() {
		return this.#id != null;
	}
	#resolve_min(min, n) {
		if (min == null) return Array.from({ length: n }, () => 0);
		if (typeof min === "number") return Array.from({ length: n }, () => min);
		return min.slice();
	}
	/** Grow the tracked pane count to at least `n`, seeding new panes with weight `1`. */
	ensureCount(n) {
		while (this.sizes.length < n) this.sizes.push(1);
		while (this.#min.length < n) this.#min.push(0);
	}
	/** Replace all weights (programmatic / controlled set). */
	setSizes(sizes) {
		this.sizes = sizes.slice();
		this.#on_change?.(this.sizes);
	}
	/** Snapshot the weights at gesture start so the move is computed from a stable base. */
	beginGutter() {
		this.#start = this.sizes.slice();
		this.#dragging = true;
	}
	/**
	* Move `deltaPx` of the container's main axis from the pane after the gutter to the pane before
	* it (clamped so neither drops below its minimum). `containerPx` converts px → weight.
	*/
	dragGutter(index, deltaPx, containerPx) {
		const s = this.#start;
		if (!s || containerPx <= 0 || index < 0 || index + 1 >= s.length) return;
		const total = s.reduce((a, b) => a + b, 0);
		const pair = s[index] + s[index + 1];
		const d = deltaPx / containerPx * total;
		const a = clamp(s[index] + d, this.#min[index] ?? 0, pair - (this.#min[index + 1] ?? 0));
		const next = s.slice();
		next[index] = a;
		next[index + 1] = pair - a;
		this.sizes = next;
		this.#on_change?.(this.sizes);
		this.#pump_presence();
	}
	/** End the gesture; emit the settled weights and (if changed) a commit op. */
	endGutter() {
		const start = this.#start;
		this.#start = null;
		this.#dragging = false;
		this.#on_resize?.(this.sizes);
		if (!start || start.length !== this.sizes.length || start.some((v, i) => v !== this.sizes[i])) this.#emit_commit({
			type: "splitpane",
			target: this.targetId,
			sizes: this.sizes.slice()
		});
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
	/** Apply a remote split-pane fact — set the layout. A no-op while a local gesture owns it (the
	* local commit wins, last-write-wins). Foreign kinds ignored. */
	applyExternal(op) {
		if (op.type !== "splitpane" || this.#dragging) return;
		this.setSizes(op.sizes);
	}
	/** Render a remote peer's in-flight drag — set the live layout (no-op during a local gesture). */
	showRemotePresence(frame) {
		if (frame.type !== "splitpane" || this.#dragging) return;
		this.setSizes(frame.sizes);
	}
	clearRemotePresence() {}
	#emit_commit(op) {
		this.#on_commit?.(op);
		for (const fn of this.#commit_subscribers) fn(op);
	}
	#pump_presence() {
		if (this.#presence_subscribers.size === 0) return;
		const frame = {
			type: "splitpane",
			target: this.targetId,
			sizes: this.sizes.slice()
		};
		for (const fn of this.#presence_subscribers) fn(frame);
	}
};
/**
* Drag plugin for the gutter between pane `index` and `index + 1`. It reads the gutter's drag offset
* (a `Draggable` on that axis), maps it to a neighbour-pair resize, and returns `{ x: 0, y: 0 }` so
* the gutter itself never translates — the flex layout repositions it as the panes change. Spread
* the gutter element with a `Draggable({ axis, use: [splitGutter(...)] })`.
*/
function splitGutter(controller, index, containerPx) {
	return {
		name: "split-gutter",
		onStart: () => controller.beginGutter(),
		onMove: ({ offset }) => {
			const delta = controller.axis === "x" ? offset.x : offset.y;
			controller.dragGutter(index, delta, containerPx());
			return {
				x: 0,
				y: 0
			};
		},
		onEnd: () => controller.endGutter()
	};
}
/**
* Framework-agnostic, DOM-aware split-pane binder. Register the wrapper with `container(el)`, each
* pane with `pane(el, i)`, and each divider with `gutter(el, i)` (between pane `i` and `i + 1`) — each
* returns a disposer, so elements bind independently and in any order. The container becomes a flex
* row/column, panes carry the live `flex` weight, and a gutter is a one-axis `Draggable` running the
* `splitGutter` plugin. Read live weights from `sizes`. Framework wrappers map the register methods to
* refs/attachments and mirror `onChange`; vanilla uses it directly. Pass a `room` to sync the layout.
*/
var SplitPane = class {
	axis;
	#ctrl;
	#room;
	#id;
	#on_change;
	#container = null;
	#room_off = null;
	#panes = /* @__PURE__ */ new Map();
	constructor(options = {}) {
		this.axis = options.axis ?? "x";
		this.#room = options.room;
		this.#id = options.id;
		this.#on_change = options.onChange;
		this.#ctrl = new SplitPaneController({
			...options,
			onChange: () => this.#emit(),
			onResize: options.onResize
		});
	}
	/** Live pane weights (the controller's array — copy before mutating). */
	get sizes() {
		return this.#ctrl.sizes;
	}
	/** Programmatically set the weights (e.g. a reset or a preset layout). */
	setSizes(sizes) {
		this.#ctrl.setSizes(sizes);
	}
	/** Register the container element. Returns a disposer. */
	container(el) {
		this.#container = el;
		el.style.display = "flex";
		el.style.flexDirection = this.axis === "x" ? "row" : "column";
		if (this.#room) this.#room_off = this.#room.add(this.#ctrl, this.#id);
		return () => {
			this.#room_off?.();
			this.#room_off = null;
			if (this.#container === el) this.#container = null;
		};
	}
	/** Register pane `index`. Returns a disposer. */
	pane(el, index) {
		this.#panes.set(index, el);
		const grew = index + 1 > this.#ctrl.sizes.length;
		this.#ctrl.ensureCount(index + 1);
		el.style.overflow = "hidden";
		el.style.minWidth = "0";
		el.style.minHeight = "0";
		if (grew) this.#emit();
		else this.#apply_panes();
		return () => {
			if (this.#panes.get(index) === el) this.#panes.delete(index);
		};
	}
	/** Register the gutter between pane `index` and `index + 1`. Returns a disposer. */
	gutter(el, index) {
		const inst = new Draggable(el, {
			axis: this.axis,
			use: [splitGutter(this.#ctrl, index, () => this.#container_px())]
		});
		return () => inst.destroy();
	}
	#container_px() {
		if (!this.#container) return 0;
		const r = this.#container.getBoundingClientRect();
		return this.axis === "x" ? r.width : r.height;
	}
	#apply_panes() {
		for (const [i, el] of this.#panes) el.style.flex = `${this.#ctrl.sizes[i] ?? 1} 1 0`;
	}
	#emit() {
		this.#apply_panes();
		this.#on_change?.(this.#ctrl.sizes);
	}
};
//#endregion
export { SplitPane, SplitPaneController, splitGutter };
