import { t as Draggable } from "../draggable-OC_p_tRg.js";
import { n as rectsOverlap, t as marqueeSelect } from "../marquee-Dd_gbYDW.js";
//#region src/select/select.ts
/**
* Framework-agnostic, DOM-aware rubber-band multi-select, built on the engine: the region is a
* `Draggable` running the `marqueeSelect` plugin (so it gets the same pointer-capture, sensors and
* text-selection suppression every gesture does), and it never translates. Register the region with
* `container(el)` and each selectable child with `item(value, el)` (each returns a disposer). Selected
* items get a `data-neodrag-selected` attribute to style; read the live set from `selected`. Framework
* wrappers map the register methods to refs/attachments and mirror `onChange`; vanilla uses it directly.
*/
var Selectable = class {
	#on_select;
	#on_change;
	#box;
	#selected = /* @__PURE__ */ new Set();
	#items = /* @__PURE__ */ new Map();
	#value_of = /* @__PURE__ */ new WeakMap();
	#drag = null;
	constructor(options = {}) {
		this.#on_select = options.onSelect;
		this.#on_change = options.onChange;
		this.#box = options.box ?? true;
	}
	/** The live set of selected values. */
	get selected() {
		return this.#selected;
	}
	/** Clear the selection programmatically. */
	clear() {
		this.#commit(/* @__PURE__ */ new Set());
	}
	/** Register the selectable region. Returns a disposer. */
	container(el) {
		this.#drag = new Draggable(el, { use: [marqueeSelect(() => [...this.#items.values()], (els) => this.#apply(els), { box: this.#box })] });
		return () => {
			this.#drag?.destroy();
			this.#drag = null;
		};
	}
	/** Register a selectable child for `value`. Returns a disposer. */
	item(value, el) {
		this.#items.set(value, el);
		this.#value_of.set(el, value);
		if (this.#selected.has(value)) el.setAttribute("data-neodrag-selected", "");
		return () => {
			if (this.#items.get(value) === el) {
				this.#items.delete(value);
				this.#value_of.delete(el);
			}
		};
	}
	#apply(els) {
		const next = /* @__PURE__ */ new Set();
		for (const el of els) {
			const v = this.#value_of.get(el);
			if (v !== void 0) next.add(v);
		}
		this.#commit(next);
	}
	#commit(next) {
		for (const v of this.#selected) if (!next.has(v)) {
			this.#selected.delete(v);
			this.#items.get(v)?.removeAttribute("data-neodrag-selected");
		}
		for (const v of next) if (!this.#selected.has(v)) {
			this.#selected.add(v);
			this.#items.get(v)?.setAttribute("data-neodrag-selected", "");
		}
		const list = [...this.#selected];
		this.#on_change?.(list);
		this.#on_select?.(list);
	}
};
//#endregion
export { Selectable, rectsOverlap };
