import { isKeyboardInput } from "./interaction/index.js";
import { a as mirrorPresentationTree } from "./utils-BRN9X2Lx.js";
import { n as sharedEngine, r as Interactions, t as sharedCapability } from "./shared-5VBBgXhD.js";
import { i as clearTranslate, r as applyTranslate } from "./transform-CZpREI4A.js";
import { a as Resize, c as clampSizeToBounds, d as formatLength, f as parseLength, h as readAuthoredAxis, i as RESIZE_HANDLE_ATTR, l as resolveResizeBounds, m as pxToUnit, n as Resizable, o as ResizeHandle, p as pxToAuthored, r as RESIZE_EDGES, s as ResizeState, t as preserveUnits, u as CSS_LENGTH_PATTERN } from "./resize-BmSg8AyN.js";
import { a as constrain, c as constrainGrid, i as DragState, l as dragAnchor, n as Drag, o as constrainAxis, r as DragHandle, s as constrainBounds, t as Draggable, u as proposedOffset } from "./draggable-OC_p_tRg.js";
import { _ as resolveSampler, a as Drop, c as LinearCollisionIndex, d as RafBatch, f as VirtualCollisionIndex, g as rankDrop, h as intersectionArea, i as enableNativeDnd, l as REMOTE_HOVER_ATTR, m as edgeDistanceSq, n as NATIVE_DRAG_KEY, o as DropHandle, p as centerDistanceSq, r as NativeDrag, s as DropState, t as Droppable, u as REMOTE_HOVER_MARKER_ATTR } from "./drop-BU0hHRKV.js";
import { A as stabilizeForeignInsertAt, C as reorderKeys, D as scoreTarget, E as resolveTransferTarget, O as slotBoundariesFromMids, S as releaseNode, T as resolveForeignInsertAt, _ as moveLiftedNode, a as SortableContext, b as playFlip, c as animateToOffset, d as computeGridOverIndex, f as computeTargetFromMids, g as liftNode, h as gridDisplacements, i as Sortable, j as stabilizeInsertAt, k as sortableKey, l as applyMove, m as fixedLocalCoords, n as SORTABLE_KEY_ATTR, o as SortableHandle, p as createTransferState, r as SORTABLE_LIFTED_ATTR, s as TransferRegistry, t as FLIP_MOVE_THRESHOLD_PX, u as buildMids, v as moveOpFromIndices, w as resolveAnimationDuration, x as recordFlipRects, y as placeholderRect } from "./sortable--ZstZ5oN.js";
import { t as SortableList } from "./sortable-D_KBCCPZ.js";
import { n as rectsOverlap, t as marqueeSelect } from "./marquee-Dd_gbYDW.js";
//#region src/drag/controls.ts
const ControlFrom = {
	/**
	* Build control zones from a CSS selector. The string is passed to `querySelectorAll` —
	* supply a developer-trusted/static selector, never one built from untrusted input.
	*/
	selector(selector) {
		return (root) => ControlFrom.elements(root.querySelectorAll(selector))(root);
	},
	elements(elements) {
		return (root) => {
			const root_rect = root.getBoundingClientRect();
			const data = [];
			for (let i = 0; i < elements.length; i++) {
				const el = elements[i];
				if (!el) continue;
				const rect = el.getBoundingClientRect();
				data.push({
					element: el,
					top: rect.top - root_rect.top,
					right: rect.right - root_rect.left,
					bottom: rect.bottom - root_rect.top,
					left: rect.left - root_rect.left,
					area: rect.width * rect.height
				});
			}
			return data;
		};
	}
};
function isNested(inner, outer) {
	return inner.area < outer.area && inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom;
}
function isPointInZone(x, y, zone, root_rect) {
	const rx = x - root_rect.left;
	const ry = y - root_rect.top;
	return rx >= zone.left && rx <= zone.right && ry >= zone.top && ry <= zone.bottom;
}
function containingZones(x, y, zones, root_rect) {
	const out = [];
	for (const z of zones) if (isPointInZone(x, y, z, root_rect)) out.push(z);
	out.sort((a, b) => a.area - b.area);
	return out;
}
/**
* Decide whether a point lands in an allow or block zone — the tie-break ladder. `allow_defined`
* is whether any allow zones were configured at all (an empty allow set with allow configured
* means "block everything not explicitly allowed").
*/
function resolveControl(allow, block, allow_defined, priority = "allow") {
	if (allow_defined && allow.length === 0) return {
		zone: null,
		isAllow: false
	};
	if (allow.length === 0 && block.length === 0) return {
		zone: null,
		isAllow: allow_defined ? false : true
	};
	let i = 0;
	let j = 0;
	while (i < allow.length || j < block.length) {
		const a = allow[i];
		const b = block[j];
		if (!a) return {
			zone: b,
			isAllow: false
		};
		if (!b) return {
			zone: a,
			isAllow: true
		};
		if (isNested(a, b)) return {
			zone: a,
			isAllow: true
		};
		if (isNested(b, a)) return {
			zone: b,
			isAllow: false
		};
		if (a.area === b.area && priority === "block") return {
			zone: b,
			isAllow: false
		};
		if (a.area <= b.area) return {
			zone: a,
			isAllow: true
		};
		return {
			zone: b,
			isAllow: false
		};
	}
	return {
		zone: null,
		isAllow: allow_defined ? false : true
	};
}
function toZones(input) {
	if (typeof input === "function") return input;
	if (typeof input === "string") return ControlFrom.selector(input);
	return ControlFrom.elements([input]);
}
/** Whether a pointerdown at viewport `(x, y)` inside `root` may start a drag, per `controls`. */
function controlAllowsStart(controls, root, x, y) {
	const allow = (controls.handle ? toZones(controls.handle)(root) : []).sort((a, b) => a.area - b.area);
	const block = (controls.cancel ? toZones(controls.cancel)(root) : []).sort((a, b) => a.area - b.area);
	const root_rect = root.getBoundingClientRect();
	return resolveControl(containingZones(x, y, allow, root_rect), containingZones(x, y, block, root_rect), controls.handle != null, controls.priority ?? "allow").isAllow;
}
//#endregion
//#region src/extend/auto-scroll.ts
function resolve_container$1(c) {
	return (typeof c === "function" ? c() : c) ?? null;
}
function viewport_rect() {
	return {
		top: 0,
		left: 0,
		right: window.innerWidth,
		bottom: window.innerHeight
	};
}
function read_pointer(input) {
	return {
		x: input.clientX,
		y: input.clientY
	};
}
function autoScroll(options = {}) {
	const margin = options.margin ?? 48;
	const max_speed = options.maxSpeed ?? 24;
	return {
		name: "auto-scroll",
		onMove: ({ input }) => {
			const container = resolve_container$1(options.container);
			const scroll_el = container ?? document.scrollingElement ?? document.documentElement;
			const rect = container ? container.getBoundingClientRect() : viewport_rect();
			const { x, y } = read_pointer(input);
			let dx = 0;
			let dy = 0;
			if (y < rect.top + margin) dy = -max_speed;
			else if (y > rect.bottom - margin) dy = max_speed;
			if (x < rect.left + margin) dx = -max_speed;
			else if (x > rect.right - margin) dx = max_speed;
			if (dx === 0 && dy === 0) return;
			scroll_el.scrollBy(dx, dy);
		}
	};
}
//#endregion
//#region src/extend/scroll-lock.ts
function resolve_container(c) {
	const el = typeof c === "function" ? c() : c;
	return el instanceof HTMLElement ? el : document.documentElement;
}
function touch_action_for(lock_axis) {
	if (lock_axis === "both") return "none";
	return lock_axis === "x" ? "pan-y" : "pan-x";
}
function scrollLock(options = {}) {
	const lock_axis = options.lockAxis ?? "both";
	const allow_scrollbar = options.allowScrollbar ?? false;
	let target = null;
	let saved = null;
	return {
		name: "scroll-lock",
		onStart: () => {
			target = resolve_container(options.container);
			saved = {
				user_select: target.style.getPropertyValue("user-select"),
				touch_action: target.style.getPropertyValue("touch-action"),
				overflow: target.style.getPropertyValue("overflow")
			};
			target.style.setProperty("user-select", "none");
			target.style.setProperty("-webkit-user-select", "none");
			if (!allow_scrollbar) target.style.setProperty("overflow", "hidden");
			target.style.setProperty("touch-action", touch_action_for(lock_axis));
		},
		onEnd: () => {
			if (!target || !saved) return;
			target.style.setProperty("user-select", saved.user_select);
			if (saved.user_select) target.style.setProperty("-webkit-user-select", saved.user_select);
			else target.style.removeProperty("-webkit-user-select");
			target.style.setProperty("touch-action", saved.touch_action);
			target.style.setProperty("overflow", saved.overflow);
			target = null;
			saved = null;
		}
	};
}
//#endregion
//#region src/extend/ghost.ts
const GHOST_Z_INDEX = 2147483640;
let ghost_host = null;
function ensure_ghost_host() {
	if (ghost_host?.isConnected) return ghost_host;
	ghost_host = document.createElement("div");
	ghost_host.dataset.neodragGhostHost = "";
	ghost_host.style.position = "fixed";
	ghost_host.style.inset = "0";
	ghost_host.style.zIndex = String(GHOST_Z_INDEX);
	ghost_host.style.pointerEvents = "none";
	ghost_host.style.overflow = "visible";
	ghost_host.style.margin = "0";
	ghost_host.style.padding = "0";
	ghost_host.style.border = "0";
	document.body.appendChild(ghost_host);
	return ghost_host;
}
function ghost(options = {}) {
	const opacity = options.opacity ?? .5;
	const z_index = options.zIndex ?? GHOST_Z_INDEX;
	let clone = null;
	return {
		name: "ghost",
		onStart: ({ node }) => {
			clearTranslate(node);
			document.body.classList.add("neodrag-ghost-active");
			const rect = node.getBoundingClientRect();
			const next = node.cloneNode(true);
			clone = next;
			next.classList.add("neodrag-ghost");
			if (node instanceof HTMLElement) mirrorPresentationTree(node, next);
			next.removeAttribute("data-neodrag-dragging");
			next.removeAttribute("data-neodrag-state");
			next.removeAttribute("data-neodrag-count");
			const s = next.style;
			s.opacity = String(opacity);
			s.position = "fixed";
			s.pointerEvents = "none";
			s.margin = "0";
			s.top = `${rect.top}px`;
			s.left = `${rect.left}px`;
			s.width = `${rect.width}px`;
			s.height = `${rect.height}px`;
			s.translate = "";
			s.setProperty("z-index", String(z_index), "important");
			ensure_ghost_host().appendChild(next);
		},
		onMove: ({ offset, node }) => {
			clearTranslate(node);
			if (clone) applyTranslate(clone, offset.x, offset.y);
			return {
				x: 0,
				y: 0
			};
		},
		onEnd: ({ node }) => {
			document.body.classList.remove("neodrag-ghost-active");
			clone?.remove();
			clone = null;
			clearTranslate(node);
		}
	};
}
//#endregion
//#region src/extend/haptics.ts
function buzz(pattern) {
	if (pattern === void 0) return;
	if (typeof navigator === "undefined") return;
	navigator.vibrate?.(pattern);
}
/**
* Fire `navigator.vibrate` on drag start/end — the mobile arena's <1KB opt-in.
* SSR-guarded and a no-op where the Vibration API is unsupported. Defaults to a
* single 10ms tap on start, silent on end.
*/
function haptics(opts = {}) {
	const start = opts.start ?? 10;
	const end = opts.end;
	return {
		name: "haptics",
		onStart: () => buzz(start),
		onEnd: () => buzz(end)
	};
}
//#endregion
//#region src/extend/aria.ts
function resolve_announce(announce, key) {
	if (announce === void 0) return true;
	if (typeof announce === "boolean") return announce;
	return announce[key] ?? true;
}
/**
* Announce the drag position to an ARIA live region — a tier-2 `use: []` plugin. On start it
* resolves (or creates) the live region and marks the node grabbed; each move writes the current
* offset; end clears the region and unmarks the node. Keyboard interactions are the primary
* audience (pointer drags are visible), so announcements are gated to keyboard input.
*/
function ariaDrag(options = {}) {
	const role = options?.role ?? "button";
	const label = options?.label ?? "Draggable";
	const announce = options?.announce;
	let live_region = null;
	const speak = (message) => {
		if (live_region) live_region.textContent = message;
	};
	const resolve_live_region = () => {
		const provided = options?.liveRegion?.();
		if (provided) return provided;
		const region = document.createElement("div");
		region.setAttribute("aria-live", "assertive");
		region.setAttribute("role", "status");
		region.style.cssText = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0";
		document.body.appendChild(region);
		return region;
	};
	return {
		name: "aria-drag",
		onStart({ node, input }) {
			const el = node;
			el.setAttribute("tabindex", "0");
			el.setAttribute("role", role);
			el.setAttribute("aria-label", label);
			el.setAttribute("aria-grabbed", "true");
			live_region = resolve_live_region();
			if (isKeyboardInput(input) && resolve_announce(announce, "grab")) speak("Grabbed");
		},
		onMove({ offset, input }) {
			if (!isKeyboardInput(input) || !resolve_announce(announce, "move")) return;
			speak(`Position ${Math.round(offset.x)}, ${Math.round(offset.y)}`);
		},
		onEnd({ node, input }) {
			node.setAttribute("aria-grabbed", "false");
			if (isKeyboardInput(input) && resolve_announce(announce, "drop")) speak("Released");
			else speak("");
		}
	};
}
//#endregion
//#region src/extend/snap-guides.ts
const lines_x = (r) => [
	r.left,
	r.left + r.width / 2,
	r.right
];
const lines_y = (r) => [
	r.top,
	r.top + r.height / 2,
	r.bottom
];
/** Best snap for one axis: the smallest signed delta (`target_line - dragged_line`) within the
*  threshold, plus the absolute coordinate of the line we locked to (for drawing the guide). */
function best_snap(dragged, targets, threshold) {
	let best = null;
	for (const tl of targets) for (const t of tl) for (const d of dragged) {
		const delta = t - d;
		if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) best = {
			delta,
			at: t
		};
	}
	return best;
}
/**
* Alignment-guide snapping — the Figma move. While dragging, the element's edges and center snap
* to the edges/centers of `options.targets` (other elements) within `threshold` px, and a guide line
* is drawn at each locked axis. A `use: []` plugin — `new Draggable({ use: [snapGuides({ get
* targets() { return siblings } })] })`.
*
* `targets` is the set of elements to align to (an array/NodeList, a getter, or a function returning
* one — read fresh at each gesture start). The dragged element is skipped automatically.
*/
function snapGuides(options) {
	const threshold = options.threshold ?? 5;
	const draw = options.guides ?? true;
	let start_rect = null;
	let start_offset = {
		x: 0,
		y: 0
	};
	let target_rects_x = [];
	let target_rects_y = [];
	let guide_x = null;
	let guide_y = null;
	const ensure_guide = (vertical) => {
		const el = document.createElement("div");
		el.style.cssText = `position:fixed;z-index:2147483646;pointer-events:none;background:var(--neodrag-snap-guide,#ff2d92);${vertical ? "top:0;height:100vh;width:1px;" : "left:0;width:100vw;height:1px;"}`;
		document.body.appendChild(el);
		return el;
	};
	const clear = () => {
		guide_x?.remove();
		guide_y?.remove();
		guide_x = guide_y = null;
	};
	return {
		name: "snap-guides",
		onStart: ({ offset, node }) => {
			start_rect = node.getBoundingClientRect();
			start_offset = {
				x: offset.x,
				y: offset.y
			};
			const t = options.targets;
			const list = typeof t === "function" ? t() : t;
			target_rects_x = [];
			target_rects_y = [];
			for (let i = 0; i < list.length; i++) {
				const el = list[i];
				if (!el || el === node) continue;
				const r = el.getBoundingClientRect();
				target_rects_x.push(lines_x(r));
				target_rects_y.push(lines_y(r));
			}
		},
		onMove: ({ offset }) => {
			if (!start_rect) return offset;
			const dx = offset.x - start_offset.x;
			const dy = offset.y - start_offset.y;
			const r = {
				left: start_rect.left + dx,
				top: start_rect.top + dy,
				width: start_rect.width,
				height: start_rect.height
			};
			const dragged_x = [
				r.left,
				r.left + r.width / 2,
				r.left + r.width
			];
			const dragged_y = [
				r.top,
				r.top + r.height / 2,
				r.top + r.height
			];
			const sx = best_snap(dragged_x, target_rects_x, threshold);
			const sy = best_snap(dragged_y, target_rects_y, threshold);
			if (draw) {
				if (sx) (guide_x ??= ensure_guide(true)).style.left = `${sx.at}px`;
				else {
					guide_x?.remove();
					guide_x = null;
				}
				if (sy) (guide_y ??= ensure_guide(false)).style.top = `${sy.at}px`;
				else {
					guide_y?.remove();
					guide_y = null;
				}
			}
			return {
				x: offset.x + (sx?.delta ?? 0),
				y: offset.y + (sy?.delta ?? 0)
			};
		},
		onEnd: () => {
			clear();
			start_rect = null;
		}
	};
}
//#endregion
//#region src/extend/index.ts
const ease_in_quad = (t) => t * t;
const clamp01 = (n) => n < 0 ? 0 : n > 1 ? 1 : n;
function nearest_within(targets, p, r2) {
	let best;
	let best_d = r2;
	for (const t of targets) {
		const dx = t.x - p.x;
		const dy = t.y - p.y;
		const d = dx * dx + dy * dy;
		if (d <= best_d) {
			best_d = d;
			best = t;
		}
	}
	return best;
}
/**
* Attract the dragged item to the nearest of `targets` (positions in **offset** space — deltas
* from where the drag started). Pass a number for the legacy hard-snap-within-radius behavior, or
* options for a two-zone field: drift toward the magnet inside `radius`, hard-lock inside `snap`.
* `spring: true` swaps the eased drift for momentum (fling + overshoot + settle).
*/
function magnetic(targets, options = {}) {
	const opts = typeof options === "number" ? {
		radius: options,
		snap: options
	} : options;
	const radius = opts.radius ?? 24;
	const snap = opts.snap ?? radius * .25;
	const strength = opts.strength ?? 1;
	const easing = opts.easing ?? ease_in_quad;
	const r2 = radius * radius;
	const spring = opts.spring;
	if (spring) {
		const stiffness_factor = (spring === true ? void 0 : spring.stiffness) ?? .2;
		const damping_factor = (spring === true ? void 0 : spring.damping) ?? .7;
		const pos = {
			x: 0,
			y: 0
		};
		const vel = {
			x: 0,
			y: 0
		};
		let active = false;
		let target = null;
		const reset = () => {
			active = false;
			target = null;
			vel.x = vel.y = 0;
		};
		return {
			name: "magnetic",
			onStart: reset,
			onEnd: reset,
			onMove: ({ offset }) => {
				const t = nearest_within(targets, offset, r2);
				if (!t) {
					active = false;
					target = null;
					return;
				}
				if (!active) {
					active = true;
					pos.x = offset.x;
					pos.y = offset.y;
					vel.x = vel.y = 0;
				}
				target = t;
				vel.x = (vel.x + (t.x - pos.x) * stiffness_factor) * damping_factor;
				vel.y = (vel.y + (t.y - pos.y) * stiffness_factor) * damping_factor;
				pos.x += vel.x;
				pos.y += vel.y;
				return {
					x: pos.x,
					y: pos.y
				};
			},
			animating: () => active && target != null && (Math.hypot(vel.x, vel.y) > .05 || Math.hypot(target.x - pos.x, target.y - pos.y) > .15)
		};
	}
	return {
		name: "magnetic",
		onMove: ({ offset }) => {
			const t = nearest_within(targets, offset, r2);
			if (!t) return void 0;
			const dist = Math.hypot(t.x - offset.x, t.y - offset.y);
			if (dist <= snap) return t;
			const span = radius - snap;
			const pull = easing(clamp01(span > 0 ? 1 - (dist - snap) / span : 1)) * strength;
			return {
				x: offset.x + (t.x - offset.x) * pull,
				y: offset.y + (t.y - offset.y) * pull
			};
		}
	};
}
/** Fire a callback on every drag move — e.g. analytics / telemetry. */
function onMove(fn) {
	return {
		name: "on-move",
		onMove: ({ offset }) => {
			fn(offset);
		}
	};
}
//#endregion
export { CSS_LENGTH_PATTERN, ControlFrom, Drag, DragHandle, DragState, Draggable, Drop, DropHandle, DropState, Droppable, FLIP_MOVE_THRESHOLD_PX, Interactions, LinearCollisionIndex, NATIVE_DRAG_KEY, NativeDrag, REMOTE_HOVER_ATTR, REMOTE_HOVER_MARKER_ATTR, RESIZE_EDGES, RESIZE_HANDLE_ATTR, RafBatch, Resizable, Resize, ResizeHandle, ResizeState, SORTABLE_KEY_ATTR, SORTABLE_LIFTED_ATTR, Sortable, SortableContext, SortableHandle, SortableList, TransferRegistry, VirtualCollisionIndex, animateToOffset, applyMove, applyTranslate, ariaDrag, autoScroll, buildMids, centerDistanceSq, clampSizeToBounds, clearTranslate, computeGridOverIndex, computeTargetFromMids, constrain, constrainAxis, constrainBounds, constrainGrid, controlAllowsStart, createTransferState, dragAnchor, edgeDistanceSq, enableNativeDnd, fixedLocalCoords, formatLength, ghost, gridDisplacements, haptics, intersectionArea, liftNode, magnetic, marqueeSelect, moveLiftedNode, moveOpFromIndices, onMove, parseLength, placeholderRect, playFlip, preserveUnits, proposedOffset, pxToAuthored, pxToUnit, rankDrop, readAuthoredAxis, recordFlipRects, rectsOverlap, releaseNode, reorderKeys, resolveAnimationDuration, resolveControl, resolveForeignInsertAt, resolveResizeBounds, resolveSampler, resolveTransferTarget, scoreTarget, scrollLock, sharedCapability, sharedEngine, slotBoundariesFromMids, snapGuides, sortableKey, stabilizeForeignInsertAt, stabilizeInsertAt };
