import { t as Draggable } from "../draggable-OC_p_tRg.js";
//#region src/swipe/swipe.ts
/**
* Decide a swipe's outcome from the released offset (px) and the element's size along the axis.
* `threshold` is a fraction of the size when `<= 1`, otherwise an absolute px distance. Pure.
*/
function resolveSwipe(offset, size, threshold = .4) {
	const limit = threshold <= 1 ? threshold * size : threshold;
	if (limit > 0 && Math.abs(offset) >= limit) return {
		dismissed: true,
		direction: offset < 0 ? -1 : 1
	};
	return { dismissed: false };
}
/**
* Framework-agnostic, DOM-aware swipe-to-dismiss binder, built on the core `Draggable`: the element
* follows the pointer on one axis; released past `threshold` it flies out and fires `onDismiss`,
* otherwise it springs back. Register the element with `attach(el)` (returns a disposer); read live
* `offset` / `isDismissed`. Framework wrappers map `attach` to a ref/attachment and mirror `onChange`;
* vanilla uses it directly.
*/
var Swipeable = class {
	axis;
	#threshold;
	#duration;
	#on_dismiss;
	#on_change;
	#offset = {
		x: 0,
		y: 0
	};
	#dismissed = false;
	#node = null;
	#drag = null;
	constructor(options = {}) {
		this.axis = options.axis ?? "x";
		this.#threshold = options.threshold ?? .4;
		this.#duration = options.duration ?? 220;
		this.#on_dismiss = options.onDismiss;
		this.#on_change = options.onChange;
	}
	/** Live offset (px). */
	get offset() {
		return this.#offset;
	}
	/** True once the element has been swiped out. */
	get isDismissed() {
		return this.#dismissed;
	}
	/** Register the swipeable element. Returns a disposer. */
	attach(el) {
		this.#node = el;
		this.#drag = new Draggable(el, {
			axis: this.axis,
			onDragStart: () => {
				el.style.transition = "";
			},
			onDrag: (e) => {
				this.#offset = e.offset;
				this.#emit();
			},
			onDragEnd: (e) => this.#settle(e.offset)
		});
		return () => {
			this.#drag?.destroy();
			this.#drag = null;
			this.#node = null;
		};
	}
	/** Spring the element back to rest and clear the dismissed flag (e.g. to re-show it). */
	reset() {
		this.#dismissed = false;
		this.#animate_to({
			x: 0,
			y: 0
		});
	}
	#emit() {
		this.#on_change?.({
			offset: this.#offset,
			dismissed: this.#dismissed
		});
	}
	#animate_to(target) {
		if (!this.#node || !this.#drag) return;
		this.#node.style.transition = `translate ${this.#duration}ms ease, opacity ${this.#duration}ms ease`;
		this.#offset = target;
		this.#drag.update({ position: target });
		this.#emit();
	}
	#settle(offset) {
		if (!this.#node) return;
		const size = this.axis === "x" ? this.#node.offsetWidth : this.#node.offsetHeight;
		const res = resolveSwipe(this.axis === "x" ? offset.x : offset.y, size, this.#threshold);
		if (res.dismissed) {
			const fly = res.direction * (size + 48);
			this.#dismissed = true;
			if (this.#node) this.#node.style.opacity = "0";
			this.#animate_to(this.axis === "x" ? {
				x: fly,
				y: 0
			} : {
				x: 0,
				y: fly
			});
			setTimeout(() => this.#on_dismiss?.(res.direction), this.#duration);
		} else this.#animate_to({
			x: 0,
			y: 0
		});
	}
};
//#endregion
export { Swipeable, resolveSwipe };
