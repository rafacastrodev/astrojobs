import { isPointerInput } from "./interaction/index.js";
import { i as listen, o as warnOnce, t as autoId } from "./utils-BRN9X2Lx.js";
import { i as clearTranslate, r as applyTranslate } from "./transform-CZpREI4A.js";
//#region src/sortable/sortable.ts
const auto_keys = /* @__PURE__ */ new WeakMap();
let auto_key_counter = 0;
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
function sortableKey(item) {
	if (item != null && typeof item === "object") {
		const o = item;
		if ("id" in o) return String(o.id);
		if ("key" in o) return String(o.key);
		let k = auto_keys.get(o);
		if (k === void 0) auto_keys.set(o, k = `⁣${auto_key_counter += 1}`);
		return k;
	}
	return String(item);
}
/** Apply an anchor-based move op to an ordered list, returning the new order. */
function applyMove(items, op) {
	const moved = items.find((it) => sortableKey(it) === op.itemId);
	if (!moved) return items.slice();
	const without = items.filter((it) => sortableKey(it) !== op.itemId);
	if (op.afterId === null) return [moved, ...without];
	const at = without.findIndex((it) => sortableKey(it) === op.afterId);
	if (at === -1) return [...without, moved];
	return [
		...without.slice(0, at + 1),
		moved,
		...without.slice(at + 1)
	];
}
/**
* Build the anchor op for moving the item currently at `from` so it lands at index `to`
* in the resulting order. The anchor is the key that ends up immediately before it (or
* null for the front) — derived from the order with the moved item removed.
*/
function moveOpFromIndices(keys, from, to) {
	const itemId = keys[from];
	const without = keys.filter((_, i) => i !== from);
	return {
		itemId,
		afterId: to <= 0 ? null : without[to - 1] ?? null
	};
}
/** Convenience: produce the new key order for a from→to index move. */
function reorderKeys(keys, from, to) {
	return applyMove(keys, moveOpFromIndices(keys, from, to));
}
/** Build axis-sorted midpoints from variable-sized measured rects. */
function buildMids(rects, axis) {
	const mids = [];
	for (let i = 0; i < rects.length; i++) {
		const r = rects[i];
		const mid = axis === "x" ? (r.left + r.right) / 2 : (r.top + r.bottom) / 2;
		mids.push({
			key: r.key,
			mid,
			index: i
		});
	}
	mids.sort((a, b) => a.mid - b.mid);
	return mids;
}
/** Slot boundaries are the half-points between consecutive midpoints. */
function slotBoundariesFromMids(mids) {
	const sorted = [...mids].sort((a, b) => a.mid - b.mid);
	const boundaries = [];
	for (let i = 0; i < sorted.length - 1; i++) boundaries.push((sorted[i].mid + sorted[i + 1].mid) / 2);
	return boundaries;
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
function computeTargetFromMids(mids, pos, excludeKey, len, options = {}) {
	if (mids.length === 0) return 0;
	const edge = options.edgeThresholdPx ?? 0;
	const drag_index = (excludeKey ? mids.find((e) => e.key === excludeKey) : void 0)?.index ?? -1;
	if (!options.skipDragDeadZone && options.dragFootprint && drag_index >= 0) {
		const { start, end } = options.dragFootprint;
		if (pos >= start && pos <= end) return drag_index;
	}
	let to = 0;
	for (const entry of mids) {
		if (entry.key === excludeKey) continue;
		if (pos > entry.mid + edge) to++;
	}
	return Math.min(Math.max(to, 0), len);
}
/**
* Hysteresis gate (single-list). A candidate index that is exactly one slot away from the
* current one is only accepted once the pointer has crossed the boundary by `band` px.
* Ported verbatim from `stabilizeVisualInsertAt`.
*/
function stabilizeInsertAt(current, candidate, pos, boundaries, band) {
	if (current < 0 || current === candidate) return candidate;
	if (Math.abs(candidate - current) !== 1) return candidate;
	if (candidate > current) {
		const boundary = boundaries[current];
		if (boundary !== void 0 && pos < boundary + band) return current;
	} else {
		const boundary = boundaries[candidate];
		if (boundary !== void 0 && pos > boundary - band) return current;
	}
	return candidate;
}
/**
* Hysteresis gate for foreign (cross-container) inserts where there is no dragged item in
* the list to anchor against. Ported from `stabilizeForeignInsertAt`.
*/
function stabilizeForeignInsertAt(current, candidate, pos, mids, band) {
	if (current < 0 || current === candidate) return candidate;
	if (Math.abs(candidate - current) !== 1) return candidate;
	if (mids.length === 0) return candidate;
	if (mids.length === 1) {
		const mid = mids[0].mid;
		const half = Math.max(24, band * 2);
		if (candidate > current && pos < mid + half) return current;
		if (candidate < current && pos > mid - half) return current;
		return candidate;
	}
	if (candidate > current) {
		if (pos < (mids[current].mid + mids[current + 1].mid) / 2 + band) return current;
	} else if (pos > (mids[candidate].mid + mids[candidate + 1].mid) / 2 - band) return current;
	return candidate;
}
function center(r) {
	return {
		x: (r.left + r.right) / 2,
		y: (r.top + r.bottom) / 2
	};
}
function within(r, x, y) {
	return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
/**
* Resolve the index the pointer is currently over in a grid. With `pointerWithin` an item
* the pointer is literally inside wins; otherwise (and as the fallback) the nearest center
* by squared distance wins. Ported from `computeGridOverIndex`.
*/
function computeGridOverIndex(rects, pointerX, pointerY, collision = "closestCenter") {
	if (rects.length === 0) return 0;
	if (collision === "pointerWithin") {
		for (let i = 0; i < rects.length; i++) if (within(rects[i], pointerX, pointerY)) return i;
	}
	let best = 0;
	let best_dist = Infinity;
	for (let i = 0; i < rects.length; i++) {
		const c = center(rects[i]);
		const dx = pointerX - c.x;
		const dy = pointerY - c.y;
		const dist = dx * dx + dy * dy;
		if (dist < best_dist) {
			best_dist = dist;
			best = i;
		}
	}
	return best;
}
/**
* The (dx, dy) every non-dragged item between `from` and `to` should be shifted by so the
* grid opens a gap at `to` and closes the one at `from`. Each in-between item slides into
* the slot of its neighbour (toward the drag origin), which is the rect difference — this
* is what makes wrapped rows animate correctly instead of overshooting.
*
* Ported from the index-range logic in `rectSortingStrategy`: items `(from, to]` shift one
* slot back when moving forward; items `[to, from)` shift one slot forward when moving back.
*/
function gridDisplacements(rects, from, to) {
	const shifts = /* @__PURE__ */ new Map();
	if (from === to) return shifts;
	const slot_start = (i) => ({
		x: rects[i].left,
		y: rects[i].top
	});
	if (to > from) for (let i = from + 1; i <= to && i < rects.length; i++) {
		const here = slot_start(i);
		const prev = slot_start(i - 1);
		shifts.set(i, {
			x: prev.x - here.x,
			y: prev.y - here.y
		});
	}
	else for (let i = to; i < from && i >= 0; i++) {
		const here = slot_start(i);
		const next = slot_start(i + 1);
		shifts.set(i, {
			x: next.x - here.x,
			y: next.y - here.y
		});
	}
	return shifts;
}
const FLIP_MOVE_THRESHOLD_PX = 2;
const FLIP_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
/** The Web Animations API isn't universal (e.g. jsdom) — degrade to no-op when absent. */
function canAnimate(node) {
	return typeof node.animate === "function";
}
function cancelAnimations(node) {
	if (typeof node.getAnimations !== "function") return;
	for (const animation of node.getAnimations()) animation.cancel();
}
/** Run `fn` on the next animation frame (after the host framework has committed its DOM patch),
* falling back to a synchronous call where `requestAnimationFrame` is unavailable (e.g. SSR/tests). */
function afterFrame(fn) {
	if (typeof requestAnimationFrame === "function") requestAnimationFrame(fn);
	else fn();
}
/** Snapshot the current viewport rect of each node (the "First" of FLIP). */
function recordFlipRects(nodes) {
	const rects = /* @__PURE__ */ new Map();
	for (const node of nodes) rects.set(node, node.getBoundingClientRect());
	return rects;
}
/**
* Invert + play. For each node, compare its current ("Last") rect to the captured
* ("First") rect, apply the inverse transform, then animate it back to identity. Sub-2px
* moves are skipped (noise). Resolves once every animation has settled. A zero/negative
* duration is treated as "no animation" and resolves immediately.
*/
async function playFlip(nodes, before, duration) {
	if (duration <= 0) return;
	const list = [...nodes];
	const animations = [];
	for (const node of list) {
		const prev = before.get(node);
		if (!prev) continue;
		const next = node.getBoundingClientRect();
		const dx = prev.left - next.left;
		const dy = prev.top - next.top;
		if (Math.abs(dx) < 2 && Math.abs(dy) < 2) continue;
		if (!canAnimate(node)) continue;
		const anim = node.animate({ transform: [`translate(${dx}px, ${dy}px)`, "translate(0px, 0px)"] }, {
			duration,
			easing: FLIP_EASING,
			fill: "none"
		});
		animations.push(anim);
	}
	if (animations.length === 0) return;
	await Promise.all(animations.map((animation) => animation.finished.catch(() => {
		animation.cancel();
	})));
	for (const node of list) cancelAnimations(node);
}
/**
* Animate a single (typically the just-dropped) node from its current viewport position to
* a target translate offset, returning to identity. Used to glide the lifted chip into its
* resting slot on release. Resolves when the animation settles.
*/
function animateToOffset(node, dx, dy, duration) {
	if (duration <= 0 || !canAnimate(node) || Math.abs(dx) < 2 && Math.abs(dy) < 2) return Promise.resolve();
	const animation = node.animate({ translate: [`${dx}px ${dy}px`, "0px 0px"] }, {
		duration,
		easing: FLIP_EASING,
		fill: "none"
	});
	return new Promise((resolve) => {
		const finish = () => {
			cancelAnimations(node);
			resolve();
		};
		animation.onfinish = finish;
		animation.oncancel = finish;
	});
}
/** Resolve the configured animation duration (ms) from the `boolean | number` option. */
function resolveAnimationDuration(animation) {
	if (animation === void 0 || animation === true) return 200;
	if (animation === false) return 0;
	return Math.max(0, animation);
}
const SORTABLE_LIFTED_ATTR = "data-neodrag-sortable-lifted";
const PLACEHOLDER_ATTR = "data-neodrag-sortable-placeholder";
function createsFixedContainingBlock(style) {
	if (style.transform && style.transform !== "none") return true;
	if (style.translate && style.translate !== "none") return true;
	if (style.perspective && style.perspective !== "none") return true;
	if (style.filter && style.filter !== "none") return true;
	if (style.backdropFilter && style.backdropFilter !== "none") return true;
	const will_change = style.willChange;
	if (!will_change || will_change === "auto") return false;
	for (const token of will_change.split(",")) {
		const part = token.trim();
		if (part === "transform" || part === "perspective") return true;
	}
	return false;
}
function findFixedContainingBlock(node) {
	let current = node.parentElement;
	const root = node.ownerDocument?.documentElement ?? document.documentElement;
	while (current && current !== root) {
		if (createsFixedContainingBlock(getComputedStyle(current))) return current;
		current = current.parentElement;
	}
	return root;
}
/** Convert a viewport rect to coordinates local to the fixed containing block. */
function fixedLocalCoords(node, rect) {
	const block = findFixedContainingBlock(node);
	if (block === (node.ownerDocument?.documentElement ?? document.documentElement)) return {
		left: rect.left,
		top: rect.top
	};
	const block_rect = block.getBoundingClientRect();
	return {
		left: rect.left - block_rect.left,
		top: rect.top - block_rect.top
	};
}
/**
* Lift `node`: snapshot its rect, insert a placeholder in its slot to reserve the space,
* then pin the node to `fixed` at its current visual position. Returns the captured state
* for `release`.
*/
function liftNode(node) {
	const rect = node.getBoundingClientRect();
	const style = node.style;
	const state = {
		position: style.position,
		left: style.left,
		top: style.top,
		width: style.width,
		height: style.height,
		margin: style.margin,
		zIndex: style.zIndex,
		translate: style.translate,
		placeholder: null
	};
	const parent = node.parentElement;
	if (parent) {
		const ph = node.ownerDocument.createElement(node.tagName);
		ph.setAttribute(PLACEHOLDER_ATTR, "");
		ph.style.minWidth = `${rect.width}px`;
		ph.style.minHeight = `${rect.height}px`;
		ph.style.flexShrink = "0";
		ph.style.visibility = "hidden";
		ph.style.pointerEvents = "none";
		parent.insertBefore(ph, node);
		state.placeholder = {
			node: ph,
			minWidth: ph.style.minWidth,
			minHeight: ph.style.minHeight,
			flexShrink: ph.style.flexShrink
		};
	}
	const { left, top } = fixedLocalCoords(node, rect);
	style.position = "fixed";
	style.left = `${left}px`;
	style.top = `${top}px`;
	style.width = `${rect.width}px`;
	style.height = `${rect.height}px`;
	style.margin = "0";
	style.zIndex = "1000";
	style.translate = "";
	node.setAttribute(SORTABLE_LIFTED_ATTR, "");
	return state;
}
/** Move a lifted node to follow the pointer (raw viewport delta from the lift origin). */
function moveLiftedNode(node, dx, dy) {
	node.style.translate = `${dx}px ${dy}px`;
}
/** Restore the lifted node back into the flow and remove the placeholder. */
function releaseNode(node, state) {
	for (const animation of node.getAnimations()) animation.cancel();
	const style = node.style;
	style.position = state.position;
	style.left = state.left;
	style.top = state.top;
	style.width = state.width;
	style.height = state.height;
	style.margin = state.margin;
	style.zIndex = state.zIndex;
	style.translate = state.translate;
	node.removeAttribute(SORTABLE_LIFTED_ATTR);
	if (state.placeholder) state.placeholder.node.remove();
}
/** Measure where the lifted node *would* sit in the flow (the placeholder's slot). */
function placeholderRect(state) {
	if (!state.placeholder) return null;
	return state.placeholder.node.getBoundingClientRect();
}
const POINTER_HIT_BIAS = 0;
const DRAG_CENTER_HIT_BIAS = 1e3;
const POINTER_PROXIMITY_BIAS = 2e3;
const DRAG_PROXIMITY_BIAS = 3e3;
function unionRect(rects) {
	if (!rects.length) return null;
	let left = Infinity;
	let top = Infinity;
	let right = -Infinity;
	let bottom = -Infinity;
	for (const r of rects) {
		left = Math.min(left, r.left);
		top = Math.min(top, r.top);
		right = Math.max(right, r.right);
		bottom = Math.max(bottom, r.bottom);
	}
	return {
		left,
		top,
		right,
		bottom
	};
}
function rectCenterDist(px, py, r) {
	const cx = (r.left + r.right) / 2;
	const cy = (r.top + r.bottom) / 2;
	return Math.hypot(px - cx, py - cy);
}
function approachDist(px, py, r, axis) {
	if (axis === "x") return Math.max(r.left - px, 0, px - r.right);
	return Math.max(r.top - py, 0, py - r.bottom);
}
function overlapsCross(px, py, r, axis) {
	if (axis === "x") return py >= r.top && py <= r.bottom;
	return px >= r.left && px <= r.right;
}
function pointInRect(px, py, r) {
	return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
}
function pointerInColumn(c, px, py) {
	const r = c.rect();
	return pointInRect(px, py, r) && overlapsCross(px, py, r, c.axis);
}
function scoreSample(px, py, hit_rect, axis, threshold, allow_band, inside_bias, proximity_bias) {
	if (!overlapsCross(px, py, hit_rect, axis)) return null;
	const dist = approachDist(px, py, hit_rect, axis);
	if (dist === 0) return inside_bias + rectCenterDist(px, py, hit_rect);
	if (!allow_band || dist > threshold) return null;
	return proximity_bias + dist;
}
/**
* Score how well `target` aligns with the pointer / dragged chip. Lower is better; null
* means out of range. Ported from `scoreForeignTargetProximity`.
*/
function scoreTarget(target, pointerX, pointerY, dragCenterX, dragCenterY, proximityPx) {
	const rects = target.rects();
	const has_items = rects.length > 0;
	const content_rect = unionRect(rects) ?? target.rect();
	const axis = target.axis;
	const pointer_in = pointerInColumn(target, pointerX, pointerY);
	const drag_in = pointerInColumn(target, dragCenterX, dragCenterY);
	if (!pointer_in && !drag_in) return null;
	const pointer_score = scoreSample(pointerX, pointerY, content_rect, axis, proximityPx, has_items, POINTER_HIT_BIAS, POINTER_PROXIMITY_BIAS) ?? Infinity;
	const drag_score = scoreSample(dragCenterX, dragCenterY, content_rect, axis, proximityPx, has_items, DRAG_CENTER_HIT_BIAS, DRAG_PROXIMITY_BIAS) ?? Infinity;
	let score = pointer_score;
	if (!Number.isFinite(score)) score = drag_score;
	if (!Number.isFinite(score)) if (pointer_in) score = POINTER_HIT_BIAS + approachDist(pointerX, pointerY, content_rect, axis) + rectCenterDist(pointerX, pointerY, content_rect);
	else if (drag_in) score = DRAG_CENTER_HIT_BIAS + approachDist(dragCenterX, dragCenterY, content_rect, axis) + rectCenterDist(dragCenterX, dragCenterY, content_rect);
	else return null;
	return score;
}
/**
* Registry of grouped containers. The source consults it during a drag. Keyed by identity
* so two `SortableList`s in the same `group` find each other without any wiring.
*/
var TransferRegistry = class {
	#containers = /* @__PURE__ */ new Map();
	register(c) {
		this.#containers.set(c.id, c);
	}
	unregister(id) {
		this.#containers.delete(id);
	}
	get(id) {
		return this.#containers.get(id);
	}
	/**
	* Best foreign container for the pointer, or null. Skips the source and any container in
	* a different group. Ported from `pickBestForeignTarget`.
	*/
	pickBestForeignTarget(source, pointerX, pointerY, dragCenterX, dragCenterY, proximityPx, accept) {
		if (!source.group) return null;
		let best = null;
		let best_score = Infinity;
		for (const c of this.#containers.values()) {
			if (c.id === source.id) continue;
			if (c.group !== source.group) continue;
			if (accept && !accept(c)) continue;
			const score = scoreTarget(c, pointerX, pointerY, dragCenterX, dragCenterY, proximityPx);
			if (score == null || score >= best_score) continue;
			best_score = score;
			best = c;
		}
		return best;
	}
	/** Plain pointer-inside-container hit, used as the sticky-target fallback. */
	findByContainerPointer(source, px, py, accept) {
		if (!source.group) return null;
		for (const c of this.#containers.values()) {
			if (c.id === source.id) continue;
			if (c.group !== source.group) continue;
			if (accept && !accept(c)) continue;
			if (pointerInColumn(c, px, py)) return c;
		}
		return null;
	}
};
/**
* Resolve the insert index into a foreign target. Appends past the content end edge along
* the approach axis; otherwise the nearest midpoint crossing. Ported from
* `resolveForeignInsertAt` / `foreignColumnShouldAppendAtEnd`.
*/
function resolveForeignInsertAt(target, pointerX, pointerY) {
	const rects = target.rects();
	const len = rects.length;
	if (len === 0) return 0;
	const axis = target.axis;
	const content_rect = unionRect(rects);
	if (axis === "x" ? pointerX > content_rect.right : pointerY > content_rect.bottom) return len;
	const pos = axis === "x" ? pointerX : pointerY;
	let to = 0;
	for (let i = 0; i < len; i++) {
		const r = rects[i];
		if (pos > (axis === "x" ? (r.left + r.right) / 2 : (r.top + r.bottom) / 2)) to = i + 1;
		else break;
	}
	return Math.min(Math.max(to, 0), len);
}
function createTransferState() {
	return { stickyTargetId: null };
}
/**
* Resolve the transfer target for this move with sticky-hold semantics. The best proximity
* winner is preferred; failing that the pointer-in-container hit; failing that the
* remembered sticky target if the pointer is still inside it. Ported from
* `resolveTransferTarget`.
*/
function resolveTransferTarget(registry, state, source, pointerX, pointerY, dragCenterX, dragCenterY, proximityPx, accept) {
	let target = registry.pickBestForeignTarget(source, pointerX, pointerY, dragCenterX, dragCenterY, proximityPx, accept);
	if (target) {
		state.stickyTargetId = target.id;
		return target;
	}
	target = registry.findByContainerPointer(source, pointerX, pointerY, accept);
	if (target) {
		state.stickyTargetId = target.id;
		return target;
	}
	if (state.stickyTargetId) {
		const sticky = registry.get(state.stickyTargetId) ?? null;
		if (sticky && (!accept || accept(sticky)) && pointerInColumn(sticky, pointerX, pointerY)) return sticky;
		state.stickyTargetId = null;
	}
	return null;
}
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
const SORTABLE_KEY_ATTR = "data-neodrag-sortable-key";
const DRAGGING_MARKER = "data-neodrag-sortable-dragging";
const DRAG_Z_INDEX = "9999";
const ELEVATED_SOURCE_ATTR = "data-neodrag-sortable-elevated-source";
const INDICATOR_ATTR = "data-neodrag-sortable-indicator";
const GHOST_ATTR = "data-neodrag-sortable-ghost";
/** Marks a placeholder rendered for a *remote* peer's in-flight reorder (their ghost in our list). */
const REMOTE_GHOST_ATTR = "data-neodrag-sortable-remote-ghost";
function eventPath(input) {
	if (isPointerInput(input)) return input.native.composedPath();
	return input.target ? [input.target] : [];
}
let next_context_id = 0;
var SortableContext = class {
	container;
	options;
	id = Symbol(`sortable-${next_context_id++}`);
	/** Auto target id — peer-local; `targetId` prefers `options.id`. */
	auto_target_id = autoId("sortable");
	commit_subscribers = /* @__PURE__ */ new Set();
	presence_subscribers = /* @__PURE__ */ new Set();
	/** Remote peers' rendered ghost placeholders, keyed by peer id. */
	remote_ghosts = /* @__PURE__ */ new Map();
	constructor(container, options) {
		this.container = container;
		this.options = options;
	}
	get axis() {
		return this.options.axis ?? "y";
	}
	get strategy() {
		return this.options.strategy ?? "list";
	}
	get targetId() {
		return this.options.id ?? this.auto_target_id;
	}
	get hasExplicitId() {
		return this.options.id != null;
	}
	/** The current key order of this list. */
	keys() {
		return this.options.items.map((it) => sortableKey(it));
	}
};
/**
* Single in-flight reorder snapshot — measured once at start. `toIndex` is the only thing
* that mutates as the pointer moves. Now also carries the FLIP/lift/hysteresis state.
*/
var IntentSnapshot = class {
	context;
	items;
	from_index;
	axis;
	slot;
	to_index;
	/** The `to_index` whose displacement is currently written to the DOM — drives incremental
	* projection: only the union of the old and new displaced ranges needs touching per move. */
	applied_to;
	lift = null;
	/** The transfer target this move is heading into (cross-container), or null. */
	foreign_target = null;
	transfer_state = createTransferState();
	/** Slot boundaries (between mids) for hysteresis. */
	boundaries;
	mids;
	/** Reused dead-zone footprint scratch for `#targetIndex` (overwritten each move, no alloc). */
	footprint = {
		start: 0,
		end: 0
	};
	constructor(context, items, from_index, axis, slot, mids) {
		this.context = context;
		this.items = items;
		this.from_index = from_index;
		this.axis = axis;
		this.slot = slot;
		this.to_index = from_index;
		this.applied_to = from_index;
		this.mids = mids;
		const drag_key = items[from_index]?.key;
		this.boundaries = mids.filter((m) => m.key !== drag_key).sort((a, b) => a.mid - b.mid).map((m) => m.mid);
	}
};
var SortableHandle = class {
	#cap;
	#ctx;
	constructor(cap, ctx) {
		this.#cap = cap;
		this.#ctx = ctx;
	}
	update(options) {
		Object.assign(this.#ctx.options, options);
	}
	/** The list's stable string id — the `target` in the unified op grammar. */
	get targetId() {
		return this.#ctx.targetId;
	}
	/** Whether `targetId` came from an explicit `id` option (auto ids are peer-local). */
	get hasExplicitId() {
		return this.#ctx.hasExplicitId;
	}
	/** The current key order — the Room seeds its reconciler from it. */
	keys() {
		return this.#ctx.keys();
	}
	onCommit(fn) {
		this.#ctx.commit_subscribers.add(fn);
		return () => this.#ctx.commit_subscribers.delete(fn);
	}
	onPresence(fn) {
		this.#ctx.presence_subscribers.add(fn);
		return () => this.#ctx.presence_subscribers.delete(fn);
	}
	/**
	* Apply a remote fact through the same reorder path. Accepts a wire op (`{type:'move'|'transfer',
	* target, …}`) from the Room, or — legacy — a bare anchor {@link MoveOp}. Foreign op kinds no-op.
	*/
	applyExternal(op) {
		if (!("type" in op)) {
			const next = applyMove(this.#ctx.options.items, op);
			this.#ctx.options.onReorder(next, op);
			return;
		}
		this.#cap.applyExternalOp(this.#ctx, op);
	}
	/** Render a remote peer's in-flight reorder as a ghost placeholder. Foreign kinds no-op. */
	showRemotePresence(frame, opts) {
		if (frame.type === "sortable") this.#cap.showRemotePresence(this.#ctx, frame, opts);
	}
	clearRemotePresence(peer_id, opts) {
		this.#cap.clearRemotePresence(this.#ctx, peer_id, opts);
	}
	/** Current in-flight reorder presence, or null. */
	presence() {
		return this.#cap.presenceFor(this.#ctx);
	}
	destroy() {
		this.#cap._unbind(this.#ctx);
	}
};
const SORTABLE_KEY = Symbol("neodrag.sortable");
/**
* The sortable capability. Deep pipeline: measure (variable sizes) → resolve insert
* (anchor, with hysteresis) → project displacement (1D list shift or 2D grid shift) →
* commit (FLIP). Optionally lifts the dragged node to `fixed`. Grouped containers exchange
* items via the cross-container transfer registry, firing `onTransfer` on the target.
*/
var Sortable = class {
	key = SORTABLE_KEY;
	name = "sortable";
	priority = 0;
	#contexts = /* @__PURE__ */ new Map();
	#registry = new TransferRegistry();
	#intent = null;
	#foreign_gap_id = null;
	#foreign_gap_at = -1;
	#foreign_touched = /* @__PURE__ */ new Set();
	#raised_node = null;
	#saved_node_z = "";
	#saved_node_pos = "";
	#raised_list = null;
	#saved_list_z = "";
	#saved_list_pos = "";
	#indicator_el = null;
	#foreign_item_rects = /* @__PURE__ */ new Map();
	#foreign_container_rects = /* @__PURE__ */ new Map();
	#on_foreign_invalidate = () => {
		this.#foreign_item_rects.clear();
		this.#foreign_container_rects.clear();
	};
	#unlisten_foreign_invalidation = [];
	bind(container, options) {
		const ctx = new SortableContext(container, options);
		if (options.onCommit && options.id == null) warnOnce("sortable:id", "this sortable uses onCommit but has no `id` — auto ids are peer-local and will not match across collaborating clients. Give it a stable `id`.");
		this.#contexts.set(container, ctx);
		this.#registry.register(this.#transferContainer(ctx));
		return new SortableHandle(this, ctx);
	}
	/** @internal */
	_unbind(ctx) {
		this.#contexts.delete(ctx.container);
		this.#registry.unregister(ctx.id);
	}
	resolve(input) {
		for (const el of eventPath(input)) {
			if (!(el instanceof HTMLElement)) {
				if (el === document) break;
				continue;
			}
			if (!el.hasAttribute("data-neodrag-sortable-key")) continue;
			let owner = el.parentElement;
			while (owner) {
				const ctx = this.#contexts.get(owner);
				if (ctx) {
					if (ctx.options.disabled) return null;
					return {
						node: el,
						data: {
							ctx,
							key: el.getAttribute(SORTABLE_KEY_ATTR)
						}
					};
				}
				owner = owner.parentElement;
			}
		}
		return null;
	}
	start(session) {
		const { ctx, key } = session.target.data;
		const items = this.#measure(ctx);
		const from_index = items.findIndex((it) => it.key === key);
		if (from_index === -1) return;
		const slot = this.#slot(items, from_index, ctx.axis);
		const mids = buildMids(this.#itemRects(items), ctx.axis);
		this.#intent = new IntentSnapshot(ctx, items, from_index, ctx.axis, slot, mids);
		const node = items[from_index].node;
		node.setAttribute(DRAGGING_MARKER, "");
		const line_mode = ctx.options.indicator === "line";
		this.#removeIndicator();
		if (ctx.options.lift || line_mode) this.#intent.lift = liftNode(node);
		if (line_mode && this.#intent.lift) this.#makeGhost(node, this.#intent.lift);
		this.#raiseStacking(node, ctx, Boolean(this.#intent.lift));
		const duration = resolveAnimationDuration(ctx.options.animation);
		if (!line_mode && duration > 0) {
			const transition = `translate ${duration}ms ${FLIP_EASING}`;
			for (let i = 0; i < items.length; i++) if (i !== from_index) items[i].node.style.transition = transition;
		}
		this.#foreign_gap_id = null;
		this.#foreign_gap_at = -1;
		this.#foreign_touched.clear();
		if (ctx.options.group) {
			this.#foreign_item_rects.clear();
			this.#foreign_container_rects.clear();
			this.#setupForeignInvalidation();
		}
	}
	move(session) {
		const intent = this.#intent;
		if (!intent) return;
		const dx = session.input.clientX - session.startInput.clientX;
		const dy = session.input.clientY - session.startInput.clientY;
		const node = intent.items[intent.from_index].node;
		const foreign = this.#resolveForeign(intent, session.input);
		if (foreign) {
			if (intent.foreign_target !== foreign) {
				this.#collapseSource(intent);
				this.#clearForeignGap(true);
				intent.foreign_target = foreign;
			}
			this.#projectForeign(foreign, intent, session.input);
			this.#followPointer(node, intent, dx, dy);
			this.#pumpPresence(intent);
			return;
		}
		if (intent.foreign_target) {
			intent.foreign_target = null;
			this.#clearForeignGap(true);
			this.#clearDisplacement(intent);
		}
		const to = this.#targetIndex(intent, session.input);
		if (to !== intent.to_index) {
			intent.to_index = to;
			this.#project(intent);
		}
		this.#followPointer(node, intent, dx, dy);
		this.#pumpPresence(intent);
	}
	end(session, reason) {
		const intent = this.#intent;
		if (!intent) return;
		this.#intent = null;
		this.#teardownForeignInvalidation();
		this.#foreign_item_rects.clear();
		this.#foreign_container_rects.clear();
		const ctx = intent.context;
		for (const fn of ctx.presence_subscribers) fn(null);
		const dragged_node = intent.items[intent.from_index].node;
		const duration = resolveAnimationDuration(ctx.options.animation);
		const flip_lo = Math.min(intent.from_index, intent.to_index, intent.applied_to);
		const flip_hi = Math.max(intent.from_index, intent.to_index, intent.applied_to);
		const flip_nodes = [];
		for (let i = flip_lo; i <= flip_hi; i++) flip_nodes.push(intent.items[i].node);
		const before = duration > 0 ? recordFlipRects(flip_nodes) : null;
		let transfer_flip = null;
		if (duration > 0 && reason !== "cancel" && intent.foreign_target) {
			const target_ctx = this.#contextById(intent.foreign_target.id);
			const item = ctx.options.items[intent.from_index];
			if (target_ctx && item !== void 0) transfer_flip = {
				key: sortableKey(item),
				drop_rect: dragged_node.getBoundingClientRect(),
				target_ctx,
				foreign_before: recordFlipRects(this.#orderedNodes(target_ctx))
			};
		}
		const transferred = reason !== "cancel" && intent.foreign_target ? this.#commitTransfer(intent, session.input) : false;
		for (const it of intent.items) it.node.style.transition = "";
		for (const n of this.#foreign_touched) n.style.transition = "";
		this.#foreign_touched.clear();
		this.#clearForeignGap(false);
		this.#clearDisplacement(intent);
		this.#removeIndicator();
		this.#restoreStacking();
		if (intent.lift) {
			releaseNode(dragged_node, intent.lift);
			intent.lift = null;
		} else clearTranslate(dragged_node);
		dragged_node.removeAttribute(DRAGGING_MARKER);
		if (transferred) {
			if (transfer_flip) {
				const tf = transfer_flip;
				afterFrame(() => {
					playFlip([...tf.foreign_before.keys()], tf.foreign_before, duration);
					const incoming = this.#orderedNodes(tf.target_ctx).find((n) => n.getAttribute(SORTABLE_KEY_ATTR) === tf.key);
					if (incoming) {
						const saved_z = incoming.style.zIndex;
						const saved_pos = incoming.style.position;
						if (getComputedStyle(incoming).position === "static") incoming.style.position = "relative";
						incoming.style.zIndex = DRAG_Z_INDEX;
						playFlip([incoming], new Map([[incoming, tf.drop_rect]]), duration).then(() => {
							incoming.style.zIndex = saved_z;
							incoming.style.position = saved_pos;
						});
					}
				});
			}
			return;
		}
		if (reason === "cancel" || intent.to_index === intent.from_index) {
			if (before) afterFrame(() => void playFlip(flip_nodes, before, duration));
			return;
		}
		const op = moveOpFromIndices(intent.items.map((it) => it.key), intent.from_index, intent.to_index);
		const next = applyMove(ctx.options.items, op);
		ctx.options.onReorder(next, op);
		ctx.options.onCommit?.(op);
		this.#emitWire(ctx, {
			type: "move",
			target: ctx.targetId,
			itemId: op.itemId,
			afterId: op.afterId
		});
		if (before) afterFrame(() => void playFlip(flip_nodes, before, duration));
	}
	/** Presence snapshot of an in-flight reorder for `ctx` (CRDT-ready hook, inert if unused). */
	presenceFor(ctx) {
		const intent = this.#intent;
		if (!intent || intent.context !== ctx) return null;
		return {
			dragKey: intent.items[intent.from_index].key,
			fromIndex: intent.from_index,
			toIndex: intent.to_index
		};
	}
	#followPointer(node, intent, dx, dy) {
		if (intent.lift) moveLiftedNode(node, dx, dy);
		else applyTranslate(node, dx, dy);
	}
	/**
	* Elevate the drag's stacking so a chip never slides *under* other items. The dragged node is
	* raised above its siblings (skipped when lifted — `liftNode` already pins it `fixed; z:1000`).
	* For a grouped (cross-container) drag the whole source list is raised too, with an
	* `[data-neodrag-sortable-elevated-source]` marker — otherwise the chip, trapped in its list's
	* own stacking context, can't paint above a sibling list. Inline styles are the built-in default;
	* the marker lets a host stylesheet override. `position` is promoted to `relative` only when
	* `static` (so the z-index applies) — a no-op for layout.
	*/
	#raiseStacking(node, ctx, lifted) {
		if (!lifted) {
			this.#raised_node = node;
			this.#saved_node_z = node.style.zIndex;
			this.#saved_node_pos = node.style.position;
			if (getComputedStyle(node).position === "static") node.style.position = "relative";
			node.style.zIndex = DRAG_Z_INDEX;
		}
		if (ctx.options.group) {
			const list = ctx.container;
			this.#raised_list = list;
			this.#saved_list_z = list.style.zIndex;
			this.#saved_list_pos = list.style.position;
			if (getComputedStyle(list).position === "static") list.style.position = "relative";
			list.style.zIndex = DRAG_Z_INDEX;
			list.setAttribute(ELEVATED_SOURCE_ATTR, "");
		}
	}
	#restoreStacking() {
		if (this.#raised_node) {
			this.#raised_node.style.zIndex = this.#saved_node_z;
			this.#raised_node.style.position = this.#saved_node_pos;
			this.#raised_node = null;
		}
		if (this.#raised_list) {
			this.#raised_list.style.zIndex = this.#saved_list_z;
			this.#raised_list.style.position = this.#saved_list_pos;
			this.#raised_list.removeAttribute(ELEVATED_SOURCE_ATTR);
			this.#raised_list = null;
		}
	}
	/** Turn the lift placeholder into the dimmed origin ghost — a faded copy of the item. */
	#makeGhost(node, lift) {
		const ph = lift.placeholder?.node;
		if (!ph) return;
		ph.setAttribute(GHOST_ATTR, "");
		ph.className = node.className;
		ph.innerHTML = node.innerHTML;
		ph.style.visibility = "";
		ph.style.opacity = ph.style.opacity || "0.4";
		ph.style.pointerEvents = "none";
	}
	/** The single engine-drawn drop-line (lazy, fixed-positioned on document.body, default-styled). */
	#ensureIndicator() {
		if (this.#indicator_el) return this.#indicator_el;
		const el = document.createElement("div");
		el.setAttribute(INDICATOR_ATTR, "");
		Object.assign(el.style, {
			position: "fixed",
			zIndex: DRAG_Z_INDEX,
			background: "currentColor",
			borderRadius: "2px",
			pointerEvents: "none"
		});
		document.body.appendChild(el);
		this.#indicator_el = el;
		return el;
	}
	#removeIndicator() {
		this.#indicator_el?.remove();
		this.#indicator_el = null;
	}
	/**
	* Position the drop-line at insert index `at`. A vertical bar at the item's leading edge for
	* `x`/grid, a horizontal bar for `y`. `at === len` parks it at the trailing edge of the last
	* item; an empty list parks it at the container's leading edge.
	*/
	#showIndicator(container, rects, at, axis, strategy) {
		const ind = this.#ensureIndicator();
		const vertical = axis === "x" || strategy === "grid";
		if (rects.length === 0) {
			const r = container.getBoundingClientRect();
			Object.assign(ind.style, vertical ? {
				left: `${r.left}px`,
				top: `${r.top + 4}px`,
				width: "2px",
				height: `${Math.max(r.height - 8, 8)}px`
			} : {
				left: `${r.left + 4}px`,
				top: `${r.top}px`,
				width: `${Math.max(r.width - 8, 8)}px`,
				height: "2px"
			});
			return;
		}
		const before = at < rects.length;
		const lead = before ? rects[at] : rects[rects.length - 1];
		if (vertical) {
			const x = before ? lead.left : lead.right;
			const top = Math.min(...rects.map((r) => r.top));
			const bottom = Math.max(...rects.map((r) => r.bottom));
			Object.assign(ind.style, {
				left: `${x - 1}px`,
				top: `${top}px`,
				width: "2px",
				height: `${bottom - top}px`
			});
		} else {
			const y = before ? lead.top : lead.bottom;
			const left = Math.min(...rects.map((r) => r.left));
			const right = Math.max(...rects.map((r) => r.right));
			Object.assign(ind.style, {
				left: `${left}px`,
				top: `${y - 1}px`,
				width: `${right - left}px`,
				height: "2px"
			});
		}
	}
	/** Ordered (DOM order) sortable item nodes of a container — no reflow. */
	#orderedNodes(ctx) {
		return Array.from(ctx.container.querySelectorAll(`[${SORTABLE_KEY_ATTR}]`));
	}
	/**
	* Open (or shift) the preview gap in a foreign list: every item at or past the live insert index
	* slides over by the incoming chip's extent, so a same-size slot opens where it will land. Eased
	* via the transition armed here on the foreign nodes. Re-runs only when the insert index moves.
	*/
	#projectForeign(foreign, intent, input) {
		const target_ctx = this.#contextById(foreign.id);
		if (!target_ctx) return;
		const axis = foreign.axis;
		const raw = resolveForeignInsertAt(foreign, input.clientX, input.clientY);
		const current = foreign.id === this.#foreign_gap_id ? this.#foreign_gap_at : -1;
		const pos = axis === "x" ? input.clientX : input.clientY;
		const band = target_ctx.options.hysteresis ?? 3;
		const at = stabilizeForeignInsertAt(current, raw, pos, buildMids(foreign.rects(), axis), band);
		if (foreign.id === this.#foreign_gap_id && at === this.#foreign_gap_at) return;
		this.#foreign_gap_id = foreign.id;
		this.#foreign_gap_at = at;
		if (intent.context.options.indicator === "line") {
			this.#showIndicator(target_ctx.container, foreign.rects(), at, axis, target_ctx.strategy);
			return;
		}
		const drag_rect = intent.items[intent.from_index].node.getBoundingClientRect();
		const gap = axis === "x" ? drag_rect.width : drag_rect.height;
		const duration = resolveAnimationDuration(target_ctx.options.animation);
		const transition = duration > 0 ? `translate ${duration}ms ${FLIP_EASING}` : "";
		const nodes = this.#orderedNodes(target_ctx);
		for (let i = 0; i < nodes.length; i++) {
			const n = nodes[i];
			if (transition) {
				n.style.transition = transition;
				this.#foreign_touched.add(n);
			}
			const shift = i >= at ? gap : 0;
			if (axis === "x") applyTranslate(n, shift, 0);
			else applyTranslate(n, 0, shift);
		}
	}
	/**
	* Close the foreign preview gap. `ease`: let the armed transition glide it shut (while dragging —
	* leaving a zone or switching targets). Otherwise strip the transition first for an instant clear
	* (at commit, where the inserted item takes the slot, and at teardown).
	*/
	#clearForeignGap(ease) {
		if (this.#foreign_gap_id == null) return;
		const target_ctx = this.#contextById(this.#foreign_gap_id);
		if (target_ctx) for (const n of this.#orderedNodes(target_ctx)) {
			if (!ease) n.style.transition = "";
			clearTranslate(n);
		}
		this.#foreign_gap_id = null;
		this.#foreign_gap_at = -1;
	}
	#transferContainer(ctx) {
		const self = this;
		return {
			id: ctx.id,
			get group() {
				return ctx.options.group;
			},
			node: ctx.container,
			get axis() {
				return ctx.axis;
			},
			rects() {
				let cached = self.#foreign_item_rects.get(ctx.id);
				if (!cached) {
					cached = self.#itemRects(self.#measure(ctx));
					self.#foreign_item_rects.set(ctx.id, cached);
				}
				return cached;
			},
			rect() {
				let cached = self.#foreign_container_rects.get(ctx.id);
				if (!cached) {
					cached = ctx.container.getBoundingClientRect();
					self.#foreign_container_rects.set(ctx.id, cached);
				}
				return cached;
			},
			accepts(item, from_node) {
				const fn = ctx.options.accepts;
				if (!fn) return true;
				try {
					return fn(item, {
						from: from_node,
						to: ctx.container
					});
				} catch {
					return false;
				}
			}
		};
	}
	#setupForeignInvalidation() {
		if (typeof window === "undefined") return;
		this.#unlisten_foreign_invalidation.push(listen(window, "scroll", this.#on_foreign_invalidate, {
			capture: true,
			passive: true
		}), listen(window, "resize", this.#on_foreign_invalidate, { passive: true }));
	}
	#teardownForeignInvalidation() {
		for (const off of this.#unlisten_foreign_invalidation) off();
		this.#unlisten_foreign_invalidation.length = 0;
	}
	#resolveForeign(intent, input) {
		const ctx = intent.context;
		if (!ctx.options.group) return null;
		const source = this.#registry.get(ctx.id);
		if (!source) return null;
		const node = intent.items[intent.from_index].node;
		const r = node.getBoundingClientRect();
		const drag_cx = (r.left + r.right) / 2;
		const drag_cy = (r.top + r.bottom) / 2;
		const proximity = ctx.options.foreignProximity ?? this.#autoProximity(r);
		const item = ctx.options.items[intent.from_index];
		const accept = (c) => c.accepts(item, node);
		return resolveTransferTarget(this.#registry, intent.transfer_state, source, input.clientX, input.clientY, drag_cx, drag_cy, proximity, accept);
	}
	#autoProximity(rect) {
		return Math.max(24, Math.min(rect.width, rect.height) * .35);
	}
	#commitTransfer(intent, input) {
		const target = intent.foreign_target;
		if (!target) return false;
		const source_ctx = intent.context;
		const target_ctx = this.#contextById(target.id);
		if (!target_ctx) return false;
		const item = source_ctx.options.items[intent.from_index];
		if (item === void 0) return false;
		const to = resolveForeignInsertAt(target, input.clientX, input.clientY);
		const wire_after_id = to > 0 ? sortableKey(target_ctx.options.items[to - 1]) : null;
		const op = {
			item,
			fromContainer: source_ctx.id,
			toContainer: target_ctx.id,
			from: intent.from_index,
			to
		};
		const source_next = source_ctx.options.items.filter((_, i) => i !== intent.from_index);
		const source_op = moveOpFromIndices(intent.items.map((it) => it.key), intent.from_index, intent.from_index);
		source_ctx.options.onReorder(source_next, source_op);
		if (target_ctx.options.onTransfer) target_ctx.options.onTransfer(op);
		else {
			const target_items = target_ctx.options.items.slice();
			target_items.splice(to, 0, item);
			const before_key = to > 0 ? sortableKey(target_items[to - 1]) : null;
			target_ctx.options.onReorder(target_items, {
				itemId: sortableKey(item),
				afterId: before_key
			});
		}
		this.#emitWire(source_ctx, {
			type: "transfer",
			target: target_ctx.targetId,
			from: source_ctx.targetId,
			itemId: sortableKey(item),
			afterId: wire_after_id
		});
		return true;
	}
	#contextById(id) {
		for (const ctx of this.#contexts.values()) if (ctx.id === id) return ctx;
	}
	#contextByTargetId(id) {
		for (const ctx of this.#contexts.values()) if (ctx.targetId === id) return ctx;
	}
	/** Fan a durable wire op out to a context's commit subscribers (the Room). */
	#emitWire(ctx, op) {
		for (const fn of ctx.commit_subscribers) fn(op);
	}
	/** Broadcast the current in-flight reorder as a wire presence frame. */
	#pumpPresence(intent) {
		const ctx = intent.context;
		if (ctx.presence_subscribers.size === 0) return;
		const drag_key = intent.items[intent.from_index]?.key;
		if (drag_key == null) return;
		const frame = {
			type: "sortable",
			target: ((intent.foreign_target ? this.#contextById(intent.foreign_target.id) : ctx) ?? ctx).targetId,
			fromTarget: ctx.targetId,
			itemId: drag_key,
			insertIndex: intent.to_index,
			rel: null
		};
		for (const fn of ctx.presence_subscribers) fn(frame);
	}
	/** Apply a remote wire op (`move`/`transfer`) through the same reorder paths a local commit uses.
	*  Foreign op kinds (drag/resize/rotate) no-op. @internal */
	applyExternalOp(ctx, op) {
		if (op.type === "move") {
			if (op.target !== ctx.targetId) return;
			const internal = {
				itemId: op.itemId,
				afterId: op.afterId
			};
			const next = applyMove(ctx.options.items, internal);
			ctx.options.onReorder(next, internal);
		} else if (op.type === "transfer") this.#applyTransferOp(op);
	}
	/** Apply a remote cross-list transfer: remove from the `from` list, insert into the `target`. */
	#applyTransferOp(op) {
		const from_ctx = this.#contextByTargetId(op.from);
		const to_ctx = this.#contextByTargetId(op.target);
		if (!from_ctx || !to_ctx) return;
		const from_index = from_ctx.options.items.findIndex((it) => sortableKey(it) === op.itemId);
		if (from_index === -1) return;
		const item = from_ctx.options.items[from_index];
		const target_without = to_ctx.options.items.filter((it) => sortableKey(it) !== op.itemId);
		const at = op.afterId === null ? 0 : (() => {
			const i = target_without.findIndex((it) => sortableKey(it) === op.afterId);
			return i === -1 ? target_without.length : i + 1;
		})();
		const source_next = from_ctx.options.items.filter((_, i) => i !== from_index);
		from_ctx.options.onReorder(source_next, {
			itemId: op.itemId,
			afterId: null
		});
		const internal_op = {
			item,
			fromContainer: from_ctx.id,
			toContainer: to_ctx.id,
			from: from_index,
			to: at
		};
		if (to_ctx.options.onTransfer) to_ctx.options.onTransfer(internal_op);
		else {
			const target_items = to_ctx.options.items.slice();
			target_items.splice(at, 0, item);
			to_ctx.options.onReorder(target_items, {
				itemId: op.itemId,
				afterId: op.afterId
			});
		}
	}
	/** Render a remote peer's in-flight reorder as a ghost placeholder at its insert slot. @internal */
	showRemotePresence(ctx, frame, _opts) {
		if (frame.target !== ctx.targetId) {
			this.clearRemotePresence(ctx, frame.peerId);
			return;
		}
		let ghost = ctx.remote_ghosts.get(frame.peerId);
		if (!ghost) {
			ghost = document.createElement("li");
			ghost.setAttribute(REMOTE_GHOST_ATTR, frame.peerId);
			ghost.style.pointerEvents = "none";
			ctx.remote_ghosts.set(frame.peerId, ghost);
		}
		const ref = Array.from(ctx.container.children).filter((c) => c.hasAttribute("data-neodrag-sortable-key"))[frame.insertIndex] ?? null;
		ctx.container.insertBefore(ghost, ref);
	}
	/** Remove a remote peer's ghost (or all ghosts when no peer id is given). @internal */
	clearRemotePresence(ctx, peer_id, _opts) {
		if (peer_id) {
			const g = ctx.remote_ghosts.get(peer_id);
			if (g) {
				g.remove();
				ctx.remote_ghosts.delete(peer_id);
			}
			return;
		}
		for (const g of ctx.remote_ghosts.values()) g.remove();
		ctx.remote_ghosts.clear();
	}
	#measure(ctx) {
		const nodes = ctx.container.querySelectorAll(`[${SORTABLE_KEY_ATTR}]`);
		return Array.from(nodes, (node) => ({
			key: node.getAttribute(SORTABLE_KEY_ATTR),
			node,
			rect: node.getBoundingClientRect()
		}));
	}
	#itemRects(items) {
		return items.map((it) => ({
			key: it.key,
			left: it.rect.left,
			top: it.rect.top,
			right: it.rect.right,
			bottom: it.rect.bottom
		}));
	}
	#slot(items, from, axis) {
		const start = (r) => axis === "y" ? r.top : r.left;
		if (from + 1 < items.length) return start(items[from + 1].rect) - start(items[from].rect);
		if (from > 0) return start(items[from].rect) - start(items[from - 1].rect);
		const r = items[from].rect;
		return axis === "y" ? r.height : r.width;
	}
	#targetIndex(intent, input) {
		if (intent.context.strategy === "grid") return computeGridOverIndex(this.#itemRects(intent.items), input.clientX, input.clientY, "closestCenter");
		const pos = intent.axis === "y" ? input.clientY : input.clientX;
		const drag_rect = intent.items[intent.from_index].rect;
		const drag_key = intent.items[intent.from_index].key;
		const footprint = intent.footprint;
		if (intent.axis === "y") {
			footprint.start = drag_rect.top;
			footprint.end = drag_rect.bottom;
		} else {
			footprint.start = drag_rect.left;
			footprint.end = drag_rect.right;
		}
		const raw = computeTargetFromMids(intent.mids, pos, drag_key, intent.items.length, {
			dragFootprint: intent.lift ? null : footprint,
			skipDragDeadZone: Boolean(intent.lift)
		});
		const band = intent.context.options.hysteresis ?? 3;
		return stabilizeInsertAt(intent.to_index, raw, pos, intent.boundaries, band);
	}
	#project(intent) {
		if (intent.context.options.indicator === "line") {
			this.#showIndicator(intent.context.container, intent.items.map((it) => it.rect), intent.to_index, intent.axis, intent.context.strategy);
			return;
		}
		if (intent.context.strategy === "grid") {
			this.#projectGrid(intent);
			return;
		}
		const { items, from_index, to_index, axis, slot } = intent;
		const lo = Math.min(from_index, intent.applied_to, to_index);
		const hi = Math.max(from_index, intent.applied_to, to_index);
		for (let i = lo; i <= hi; i++) {
			if (i === from_index) continue;
			let shift = 0;
			if (to_index > from_index && i > from_index && i <= to_index) shift = -slot;
			else if (to_index < from_index && i >= to_index && i < from_index) shift = slot;
			if (axis === "y") applyTranslate(items[i].node, 0, shift);
			else applyTranslate(items[i].node, shift, 0);
		}
		intent.applied_to = to_index;
	}
	#projectGrid(intent) {
		const shifts = gridDisplacements(this.#itemRects(intent.items), intent.from_index, intent.to_index);
		const lo = Math.min(intent.from_index, intent.applied_to, intent.to_index);
		const hi = Math.max(intent.from_index, intent.applied_to, intent.to_index);
		for (let i = lo; i <= hi; i++) {
			if (i === intent.from_index) continue;
			const shift = shifts.get(i);
			if (shift) applyTranslate(intent.items[i].node, shift.x, shift.y);
			else clearTranslate(intent.items[i].node);
		}
		intent.applied_to = intent.to_index;
	}
	#clearDisplacement(intent) {
		const lo = Math.min(intent.from_index, intent.applied_to);
		const hi = Math.max(intent.from_index, intent.applied_to);
		for (let i = lo; i <= hi; i++) {
			if (i === intent.from_index) continue;
			clearTranslate(intent.items[i].node);
		}
		intent.applied_to = intent.from_index;
	}
	/**
	* The dragged item has left for a foreign list — collapse its slot in the *source* so the
	* remaining items close up over it, instead of leaving a ghost gap where it used to sit (a
	* non-lifted item keeps its layout box, so just clearing displacement snaps siblings back
	* *behind* it). Items after the grabbed index slide back one slot; items before it reset. Eased
	* via the armed transition. `applied_to` is parked past the tail so a later #clearDisplacement
	* (on re-entry / release) undoes the whole collapsed range.
	*/
	#collapseSource(intent) {
		if (intent.context.options.indicator === "line") return;
		const { items, from_index, axis, slot } = intent;
		for (let i = 0; i < items.length; i++) {
			if (i === from_index) continue;
			const shift = i > from_index ? -slot : 0;
			if (axis === "y") applyTranslate(items[i].node, 0, shift);
			else applyTranslate(items[i].node, shift, 0);
		}
		intent.applied_to = Math.max(from_index, items.length - 1);
	}
};
//#endregion
export { stabilizeForeignInsertAt as A, reorderKeys as C, scoreTarget as D, resolveTransferTarget as E, slotBoundariesFromMids as O, releaseNode as S, resolveForeignInsertAt as T, moveLiftedNode as _, SortableContext as a, playFlip as b, animateToOffset as c, computeGridOverIndex as d, computeTargetFromMids as f, liftNode as g, gridDisplacements as h, Sortable as i, stabilizeInsertAt as j, sortableKey as k, applyMove as l, fixedLocalCoords as m, SORTABLE_KEY_ATTR as n, SortableHandle as o, createTransferState as p, SORTABLE_LIFTED_ATTR as r, TransferRegistry as s, FLIP_MOVE_THRESHOLD_PX as t, buildMids as u, moveOpFromIndices as v, resolveAnimationDuration as w, recordFlipRects as x, placeholderRect as y };
