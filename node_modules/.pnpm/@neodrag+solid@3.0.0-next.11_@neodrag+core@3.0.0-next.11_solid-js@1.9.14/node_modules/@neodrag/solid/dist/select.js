import { createSignal, onCleanup } from "solid-js";
import { Selectable, rectsOverlap } from "@neodrag/core/select";
//#region src/select.ts
/**
* Rubber-band multi-select primitive — a thin adapter over the core `Selectable` binder (the region
* is a `Draggable` running the `marqueeSelect` plugin). Put `container` on the region's `ref` and
* `item(value)` on each child's `ref`. `selected()` is the live array of selected values; selected
* items also carry a `data-neodrag-selected` attribute to style.
*/
function createSelect(options = {}) {
	const [selected, set_selected] = createSignal([]);
	const item_refs = /* @__PURE__ */ new Map();
	const inst = new Selectable({
		...options,
		onChange: (list) => set_selected(list)
	});
	let c_dispose = null;
	const container = (node) => {
		c_dispose?.();
		c_dispose = node ? inst.container(node) : null;
	};
	const item = (value) => {
		let cb = item_refs.get(value);
		if (!cb) {
			let off = null;
			cb = (node) => {
				off?.();
				off = node ? inst.item(value, node) : null;
			};
			item_refs.set(value, cb);
		}
		return cb;
	};
	const clear = () => inst.clear();
	onCleanup(() => {
		c_dispose?.();
		c_dispose = null;
	});
	return {
		container,
		item,
		selected,
		clear
	};
}
//#endregion
export { createSelect, rectsOverlap };
