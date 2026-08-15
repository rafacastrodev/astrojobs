import { isPointerInput } from "./interaction/index.js";
import { n as is_svg_element, o as warnOnce, t as autoId } from "./utils-BRN9X2Lx.js";
import { t as sharedCapability } from "./shared-5VBBgXhD.js";
import { i as clearTranslate, n as TRANSLATE_RESIZE, r as applyTranslate } from "./transform-CZpREI4A.js";
import { t as inverseScaleFromNode } from "./inverse-scale-BCb2f85l.js";
//#region src/units.ts
/** Anchored + linear (ReDoS-safe) matcher for a single `<number><unit>` length token. */
const CSS_LENGTH_PATTERN = /^(-?\d*\.?\d+)(px|%|rem|em|ch|ex|vw|vh|vmin|vmax)$/;
/** Compact length value — integers bare, floats trimmed to 4dp (`37.5`, not `37.5000`). */
function formatLength(n) {
	if (Number.isInteger(n)) return String(n);
	return n.toFixed(4).replace(/\.?0+$/, "");
}
/** Parse a single CSS length token (`'50%'`, `'12rem'`), or null if it isn't one. */
function parseLength(raw) {
	const match = CSS_LENGTH_PATTERN.exec(raw.trim());
	if (!match) return null;
	return {
		value: Number.parseFloat(match[1]),
		unit: match[2]
	};
}
function root_font_size_px() {
	const n = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
	return Number.isFinite(n) && n > 0 ? n : 16;
}
function element_font_size_px(node) {
	if (!(node instanceof HTMLElement)) return root_font_size_px();
	const n = Number.parseFloat(getComputedStyle(node).fontSize);
	return Number.isFinite(n) && n > 0 ? n : root_font_size_px();
}
function parent_rect(node) {
	return (node instanceof HTMLElement ? node.offsetParent instanceof HTMLElement ? node.offsetParent : node.parentElement : node.parentElement)?.getBoundingClientRect();
}
/** Convert a px measurement into `unit` for the given axis (`%` is parent-relative). */
function pxToUnit(px, unit, axis, node) {
	switch (unit) {
		case "px": return px;
		case "%": {
			const parent = parent_rect(node);
			const base = parent ? axis === "width" ? parent.width : parent.height : 0;
			return base > 0 ? px / base * 100 : px;
		}
		case "rem": return px / root_font_size_px();
		case "em":
		case "ch":
		case "ex": return px / element_font_size_px(node);
		case "vw": return window.innerWidth > 0 ? px / window.innerWidth * 100 : px;
		case "vh": return window.innerHeight > 0 ? px / window.innerHeight * 100 : px;
		case "vmin": {
			const v = Math.min(window.innerWidth, window.innerHeight);
			return v > 0 ? px / v * 100 : px;
		}
		case "vmax": {
			const v = Math.max(window.innerWidth, window.innerHeight);
			return v > 0 ? px / v * 100 : px;
		}
	}
}
/** The authored inline (then computed) length on an axis, if it's a single length token. */
function readAuthoredAxis(node, axis) {
	if (!(node instanceof HTMLElement)) return null;
	const inline = axis === "width" ? node.style.width : node.style.height;
	if (inline && CSS_LENGTH_PATTERN.test(inline.trim())) return inline.trim();
	const computed = getComputedStyle(node)[axis];
	if (computed && CSS_LENGTH_PATTERN.test(computed.trim())) return computed.trim();
	return null;
}
/** `px` re-expressed in `authored`'s unit, formatted (`'37.5%'`), or null if `authored` isn't a
* length token. One-call helper for unit-preserving commits. */
function pxToAuthored(px, authored, axis, node) {
	const parsed = parseLength(authored);
	if (!parsed) return null;
	return `${formatLength(pxToUnit(px, parsed.unit, axis, node))}${parsed.unit}`;
}
//#endregion
//#region src/resize/resize.ts
const clampBound = (v, lo, hi) => hi >= lo ? Math.max(lo, Math.min(hi, v)) : lo;
/** Resolve a `ResizeBoundsInput` into a concrete client-space rect (or undefined). */
function resolveResizeBounds(bounds, node) {
	if (!bounds) return void 0;
	if (bounds === "parent") {
		const parent = node.parentElement;
		return parent ? parent.getBoundingClientRect() : void 0;
	}
	if (bounds === "viewport") return {
		left: 0,
		top: 0,
		right: window.innerWidth,
		bottom: window.innerHeight
	};
	if (typeof bounds === "function") return bounds();
	if (bounds instanceof HTMLElement) return bounds.getBoundingClientRect();
	return bounds;
}
/**
* Clamp a proposed size so the element — anchored at its non-moving edge — never
* spills outside `bounds`. The moving edge is implied by `anchor`: e.g. an `e` resize
* keeps the left edge pinned and may only grow until it touches `bounds.right`; a `w`
* resize keeps the right edge pinned and is limited by `bounds.left`. Symmetric for n/s.
*
* `width`/`height` come in already in element (layout) px; `bounds` and `start_rect` are
* in client px, so we divide the slack by `inverse_scale` to convert back to layout px —
* matching how `sizeFromPointer` scales the pointer delta. Pure + DOM-free for testing.
*/
function clampSizeToBounds(width, height, anchor, bounds, start_rect, inverse_scale) {
	let max_width = Number.POSITIVE_INFINITY;
	let max_height = Number.POSITIVE_INFINITY;
	if (anchor.includes("e")) max_width = (bounds.right - start_rect.left) * inverse_scale;
	if (anchor.includes("w")) max_width = (start_rect.right - bounds.left) * inverse_scale;
	if (anchor.includes("s")) max_height = (bounds.bottom - start_rect.top) * inverse_scale;
	if (anchor.includes("n")) max_height = (start_rect.bottom - bounds.top) * inverse_scale;
	return {
		width: clampBound(width, 0, max_width),
		height: clampBound(height, 0, max_height)
	};
}
const RESIZE_HANDLE_ATTR = "data-neodrag-resize-handle";
/** All eight resize edges/corners — iterate to render a handle per edge. */
const RESIZE_EDGES = [
	"n",
	"s",
	"e",
	"w",
	"ne",
	"nw",
	"se",
	"sw"
];
/**
* px-only size math (Length is an opt-in plugin in v3, not core). Writes the proposed size
* into `out` instead of allocating — the move pipeline reuses one scratch object per binding.
*/
function sizeFromPointer(out, edge, ipx, ipy, iw, ih, x, y, inverse_scale) {
	const dx = (x - ipx) * inverse_scale;
	const dy = (y - ipy) * inverse_scale;
	let width = iw;
	let height = ih;
	if (edge.includes("e")) width = iw + dx;
	if (edge.includes("w")) width = iw - dx;
	if (edge.includes("s")) height = ih + dy;
	if (edge.includes("n")) height = ih - dy;
	out.width = width;
	out.height = height;
}
/** Lock aspect in place on `out` (reads + writes the same scratch object). */
function applyAspect(out, ratio, edge) {
	if (edge.includes("e") || edge.includes("w")) {
		out.height = out.width / ratio;
		return;
	}
	out.width = out.height * ratio;
}
/** Clamp `out` to the min/max bounds in place. */
function clampSize(out, b) {
	let width = out.width;
	let height = out.height;
	if (b.minWidth != null) width = Math.max(b.minWidth, width);
	if (b.maxWidth != null) width = Math.min(b.maxWidth, width);
	if (b.minHeight != null) height = Math.max(b.minHeight, height);
	if (b.maxHeight != null) height = Math.min(b.maxHeight, height);
	out.width = Math.max(0, width);
	out.height = Math.max(0, height);
}
const SVG_GEOMETRY = new Set([
	"rect",
	"image",
	"foreignObject",
	"svg",
	"use"
]);
/**
* Apply a px size to the node. HTML elements get CSS `width`/`height`; SVG geometry
* elements (`rect`, `image`, `svg`, …) take the `width`/`height` *attributes*, since CSS
* sizing is unreliable across SVG elements/browsers. Other SVG elements (`g`, `path`) have
* no intrinsic size attribute, so we fall back to a CSS attempt.
*/
function applySize(node, width, height) {
	if (is_svg_element(node)) {
		if (SVG_GEOMETRY.has(node.tagName.toLowerCase())) {
			node.setAttribute("width", String(width));
			node.setAttribute("height", String(height));
			return;
		}
		node.style.width = `${width}px`;
		node.style.height = `${height}px`;
		return;
	}
	const el = node;
	el.style.width = `${width}px`;
	el.style.height = `${height}px`;
}
/** Apply a far-edge pin offset. HTML uses the shared translate composer; SVG geometry elements
* (`rect`, …) take `x`/`y` attributes (the collab op's `left`/`top` are those attribute values). */
function applyPosition(node, left, top) {
	if (is_svg_element(node) && SVG_GEOMETRY.has(node.tagName.toLowerCase())) {
		node.setAttribute("x", String(left));
		node.setAttribute("y", String(top));
		return;
	}
	applyTranslate(node, left, top, TRANSLATE_RESIZE);
}
/** Eased transition for remote-driven size (commit glide + presence smoothing). */
const REMOTE_RESIZE_EASE = "width 140ms ease-out, height 140ms ease-out, translate 140ms ease-out";
var ResizeState = class {
	node;
	options;
	edge = "se";
	width = 0;
	height = 0;
	initial_width = 0;
	initial_height = 0;
	initial_pointer_x = 0;
	initial_pointer_y = 0;
	inverse_scale = 1;
	ratio = 1;
	start_rect = null;
	bounds;
	/** Committed position offset (px) — the translate a `w`/`n` resize induces to pin the far edge.
	* Persists across gestures (like a draggable's offset) and is the resize's `TRANSLATE_RESIZE`
	* contribution, so it composes with a draggable on the same node. */
	offset = {
		x: 0,
		y: 0
	};
	/** Offset snapshot at gesture start, so the in-flight shift is cumulative on prior resizes. */
	start_offset_x = 0;
	start_offset_y = 0;
	/** Reused scratch for the per-move size pipeline (sizeFromPointer → aspect → clamp). */
	size = {
		width: 0,
		height: 0
	};
	/** True while a local resize gesture owns the node — remote applies defer to it. */
	resizing = false;
	/** Auto target id — peer-local; `targetId` prefers `options.id`. */
	auto_target_id = autoId("resize");
	commit_subscribers = /* @__PURE__ */ new Set();
	presence_subscribers = /* @__PURE__ */ new Set();
	/** The peer whose remote resize is currently rendered over this node, or null. */
	remote_peer = null;
	/** A remote op that arrived while a local resize owned the node — applied on end if the local
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
			width: this.width,
			height: this.height,
			x: this.offset.x,
			y: this.offset.y,
			edge: this.edge,
			node: this.node,
			input
		};
	}
	pluginContext(input) {
		return {
			size: {
				width: this.width,
				height: this.height
			},
			initial: {
				width: this.initial_width,
				height: this.initial_height
			},
			anchor: this.edge,
			node: this.node,
			input
		};
	}
};
var ResizeHandle = class {
	#resize;
	#state;
	constructor(resize, state) {
		this.#resize = resize;
		this.#state = state;
	}
	update(options) {
		const s = this.#state;
		Object.assign(s.options, options);
		if (s.resizing) return;
		if (options.size && (options.size.width !== s.width || options.size.height !== s.height)) {
			s.width = options.size.width;
			s.height = options.size.height;
			applySize(s.node, s.width, s.height);
		}
		if (options.position && (options.position.x !== s.offset.x || options.position.y !== s.offset.y)) {
			s.offset.x = options.position.x;
			s.offset.y = options.position.y;
			applyTranslate(s.node, s.offset.x, s.offset.y, TRANSLATE_RESIZE);
		}
	}
	get size() {
		return {
			width: this.#state.width,
			height: this.#state.height
		};
	}
	/** The committed position offset (px) — the translate a `w`/`n` resize induced. Same offset
	* space as a draggable's `position`. */
	get position() {
		return {
			x: this.#state.offset.x,
			y: this.#state.offset.y
		};
	}
	/** The resizable's stable string id — the `target` in the unified op grammar. */
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
	/** Apply a remote resize fact — sizes the node to the committed dimensions (eased). Foreign kinds
	* ignored — this is the unified `CollabTarget.applyExternal`. */
	applyExternal(op) {
		if (op.type === "resize") this.#resize.applyExternal(this.#state, op);
	}
	showRemotePresence(frame) {
		if (frame.type === "resize") this.#resize.showRemotePresence(this.#state, frame);
	}
	clearRemotePresence(peerId) {
		this.#resize.clearRemotePresence(this.#state, peerId);
	}
	destroy() {
		this.#resize._unbind(this.#state.node);
		clearTranslate(this.#state.node, TRANSLATE_RESIZE);
	}
};
const RESIZE_KEY = Symbol("neodrag.resize");
/**
* The resize capability. Claims pointerdowns that land on a handle element
* (`data-neodrag-resize-handle="se"`), at a higher priority than drag so the handle wins
* over the body. px-only: size is written in pixels; unit preservation is an opt-in plugin.
*/
var Resize = class {
	key = RESIZE_KEY;
	name = "resize";
	priority = 100;
	#nodes = /* @__PURE__ */ new Map();
	bind(node, options = {}) {
		const state = new ResizeState(node, options);
		if (options.onCommit && options.id == null) warnOnce("resize:id", "this resizable uses onCommit but has no `id` — auto ids are peer-local and will not match across collaborating clients. Give it a stable `id`.");
		this.#nodes.set(node, state);
		if (options.size) {
			state.width = options.size.width;
			state.height = options.size.height;
			applySize(node, state.width, state.height);
		} else {
			const rect = node.getBoundingClientRect();
			state.width = rect.width;
			state.height = rect.height;
		}
		if (options.position) {
			state.offset.x = options.position.x;
			state.offset.y = options.position.y;
			applyTranslate(node, state.offset.x, state.offset.y, TRANSLATE_RESIZE);
		}
		return new ResizeHandle(this, state);
	}
	/** @internal */
	_unbind(node) {
		this.#nodes.delete(node);
	}
	resolve(input) {
		const hit = this.#findHandle(input);
		if (!hit) return null;
		const state = this.#nodes.get(hit.node);
		if (state.options.disabled) return null;
		state.edge = hit.edge;
		return {
			node: hit.node,
			data: state
		};
	}
	start(session) {
		const state = session.target.data;
		const rect = state.node.getBoundingClientRect();
		state.start_rect = {
			left: rect.left,
			top: rect.top,
			right: rect.right,
			bottom: rect.bottom
		};
		state.initial_width = state.width = rect.width;
		state.initial_height = state.height = rect.height;
		state.inverse_scale = inverseScaleFromNode(state.node, rect);
		state.initial_pointer_x = session.startInput.clientX;
		state.initial_pointer_y = session.startInput.clientY;
		state.bounds = resolveResizeBounds(state.options.bounds, state.node);
		state.ratio = typeof state.options.aspectRatio === "number" ? state.options.aspectRatio : rect.height ? rect.width / rect.height : 1;
		state.start_offset_x = state.offset.x;
		state.start_offset_y = state.offset.y;
		state.resizing = true;
		if (state.options.userSelect === false) session.userSelect = false;
		if (state.node instanceof HTMLElement && state.node.style) state.node.style.transition = "";
		const ev = state.event(session.input);
		if (state.options.use) {
			const ctx = state.pluginContext(session.input);
			for (const p of state.options.use) p.onStart?.(ctx);
		}
		state.options.onResizeStart?.(ev);
	}
	move(session) {
		const state = session.target.data;
		const size = state.size;
		sizeFromPointer(size, state.edge, state.initial_pointer_x, state.initial_pointer_y, state.initial_width, state.initial_height, session.input.clientX, session.input.clientY, state.inverse_scale);
		if (state.options.aspectRatio) applyAspect(size, state.ratio, state.edge);
		clampSize(size, state.options);
		if (state.bounds && state.start_rect) {
			const bounded = clampSizeToBounds(size.width, size.height, state.edge, state.bounds, state.start_rect, state.inverse_scale);
			size.width = bounded.width;
			size.height = bounded.height;
			if (state.options.minWidth != null) size.width = Math.max(state.options.minWidth, size.width);
			if (state.options.minHeight != null) size.height = Math.max(state.options.minHeight, size.height);
		}
		let width = size.width;
		let height = size.height;
		state.width = width;
		state.height = height;
		if (state.options.use) for (const p of state.options.use) {
			const adjusted = p.onMove?.(state.pluginContext(session.input));
			if (adjusted) {
				state.width = width = adjusted.width;
				state.height = height = adjusted.height;
			}
		}
		state.offset.x = state.start_offset_x + (state.edge.includes("w") ? state.initial_width - width : 0);
		state.offset.y = state.start_offset_y + (state.edge.includes("n") ? state.initial_height - height : 0);
		applySize(state.node, width, height);
		applyTranslate(state.node, state.offset.x, state.offset.y, TRANSLATE_RESIZE);
		state.options.onResize?.(state.event(session.input));
		this.#pumpPresence(state);
	}
	end(session, _reason) {
		const state = session.target.data;
		state.resizing = false;
		if (state.options.use) {
			const ctx = state.pluginContext(session.input);
			for (const p of state.options.use) p.onEnd?.(ctx);
		}
		state.options.onResizeEnd?.(state.event(session.input));
		if (state.width !== state.initial_width || state.height !== state.initial_height) {
			this.#emitCommit(state, this.#resizeOp(state));
			state.pending_remote = null;
		} else if (state.pending_remote) this.applyExternal(state, state.pending_remote);
		for (const fn of state.presence_subscribers) fn(null);
	}
	/** Build a resize op. `left`/`top` only ride along for edges that pin the far side (`w`/`n`). */
	#resizeOp(state) {
		const op = {
			type: "resize",
			target: state.targetId,
			width: state.width,
			height: state.height
		};
		if (state.edge.includes("w") || state.edge.includes("n")) {
			op.left = state.offset.x;
			op.top = state.offset.y;
		}
		return op;
	}
	#emitCommit(state, op) {
		state.options.onCommit?.(op);
		for (const fn of state.commit_subscribers) fn(op);
	}
	#pumpPresence(state) {
		if (state.presence_subscribers.size === 0) return;
		const frame = {
			type: "resize",
			target: state.targetId,
			width: state.width,
			height: state.height
		};
		if (state.edge.includes("w") || state.edge.includes("n")) {
			frame.left = state.offset.x;
			frame.top = state.offset.y;
		}
		for (const fn of state.presence_subscribers) fn(frame);
	}
	/** Apply a remote resize fact — size the node to the committed dimensions, eased. A no-op while a
	*  local resize owns the node (stashed, applied on end if the local gesture commits nothing). */
	applyExternal(state, op) {
		if (state.resizing) {
			state.pending_remote = op;
			return;
		}
		state.pending_remote = null;
		state.width = op.width;
		state.height = op.height;
		if (op.left !== void 0) state.offset.x = op.left;
		if (op.top !== void 0) state.offset.y = op.top;
		if (state.node instanceof HTMLElement && state.node.style) state.node.style.transition = REMOTE_RESIZE_EASE;
		applySize(state.node, op.width, op.height);
		applyPosition(state.node, state.offset.x, state.offset.y);
	}
	showRemotePresence(state, frame) {
		if (state.resizing) return;
		state.remote_peer = frame.peerId;
		if (state.node instanceof HTMLElement && state.node.style) state.node.style.transition = REMOTE_RESIZE_EASE;
		applySize(state.node, frame.width, frame.height);
		applyPosition(state.node, frame.left ?? state.offset.x, frame.top ?? state.offset.y);
	}
	clearRemotePresence(state, peerId) {
		if (peerId && state.remote_peer !== peerId) return;
		state.remote_peer = null;
		if (state.resizing) return;
		if (state.node instanceof HTMLElement && state.node.style) state.node.style.transition = REMOTE_RESIZE_EASE;
		applySize(state.node, state.width, state.height);
		applyPosition(state.node, state.offset.x, state.offset.y);
	}
	#findHandle(input) {
		const path = isPointerInput(input) ? input.native.composedPath() : input.target ? [input.target] : [];
		for (const el of path) {
			if (!(el instanceof HTMLElement)) {
				if (el === document) break;
				continue;
			}
			const attr = el.getAttribute(RESIZE_HANDLE_ATTR);
			if (!attr) continue;
			const edge = attr;
			let owner = el;
			while (owner) {
				if (this.#nodes.has(owner)) return {
					node: owner,
					edge
				};
				owner = owner.parentElement;
			}
		}
		return null;
	}
};
//#endregion
//#region src/resize/resizable.ts
/** Ergonomic single-element resize: `new Resizable(node, options)`. Satisfies the unified
*  {@link CollabTarget} seam, so `room.add(resizable)` works. */
var Resizable = class {
	#handle;
	constructor(node, options = {}) {
		this.#handle = sharedCapability(Resize, () => new Resize()).bind(node, options);
	}
	update(options) {
		this.#handle.update(options);
	}
	get size() {
		return this.#handle.size;
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
//#region src/resize/preserve-units.ts
/**
* Opt-in plugin that preserves authored CSS units across a resize. On start it reads the
* authored unit for each axis (e.g. `width: 50%`, `height: 12rem`); throughout the drag the
* core writes plain `px` so the geometry is exact; on end it converts the final px size back
* into the original unit and writes it as the committed value — so a `%`-sized box stays
* `%`-sized after resizing. Ported from `src/length/*` but kept as a tier-2 plugin, not core.
*/
function preserveUnits() {
	let width = null;
	let height = null;
	function read(node, axis) {
		const authored = readAuthoredAxis(node, axis);
		if (!authored) return null;
		const parsed = parseLength(authored);
		if (!parsed || parsed.unit === "px") return null;
		return { unit: parsed.unit };
	}
	function commit(axis, px, name, node) {
		if (!axis || !(node instanceof HTMLElement)) return;
		node.style[name] = `${formatLength(pxToUnit(px, axis.unit, name, node))}${axis.unit}`;
	}
	return {
		name: "preserve-units",
		onStart(ctx) {
			width = read(ctx.node, "width");
			height = read(ctx.node, "height");
		},
		onEnd(ctx) {
			commit(width, ctx.size.width, "width", ctx.node);
			commit(height, ctx.size.height, "height", ctx.node);
			width = null;
			height = null;
		}
	};
}
//#endregion
export { Resize as a, clampSizeToBounds as c, formatLength as d, parseLength as f, readAuthoredAxis as h, RESIZE_HANDLE_ATTR as i, resolveResizeBounds as l, pxToUnit as m, Resizable as n, ResizeHandle as o, pxToAuthored as p, RESIZE_EDGES as r, ResizeState as s, preserveUnits as t, CSS_LENGTH_PATTERN as u };
