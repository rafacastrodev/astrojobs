import { createSignal, onCleanup } from "solid-js";
import { SplitPane } from "@neodrag/core/splitpane";
//#region src/splitpane.ts
/**
* Split-pane primitive — a thin adapter over the core `SplitPane` binder. Put `container` on the
* wrapper's `ref`, `pane(i)` on each pane's `ref`, and `gutter(i)` on each divider's `ref` (the
* gutter between pane `i` and `i + 1`). `sizes()` is the live array of weights. Nests: each call is
* independent. Pass a `room` to sync the layout.
*/
function createSplitPane(options = {}) {
	const [sizes, set_sizes] = createSignal(options.sizes ?? []);
	const pane_refs = /* @__PURE__ */ new Map();
	const gutter_refs = /* @__PURE__ */ new Map();
	const inst = new SplitPane({
		...options,
		onChange: (s) => set_sizes(s.slice())
	});
	let c_dispose = null;
	const container = (node) => {
		c_dispose?.();
		c_dispose = node ? inst.container(node) : null;
	};
	const make = (cache, kind, index) => {
		let cb = cache.get(index);
		if (!cb) {
			let off = null;
			cb = (node) => {
				off?.();
				off = node ? kind === "pane" ? inst.pane(node, index) : inst.gutter(node, index) : null;
			};
			cache.set(index, cb);
		}
		return cb;
	};
	const pane = (index) => make(pane_refs, "pane", index);
	const gutter = (index) => make(gutter_refs, "gutter", index);
	const setSizes = (s) => inst.setSizes(s);
	onCleanup(() => {
		c_dispose?.();
		c_dispose = null;
	});
	return {
		container,
		pane,
		gutter,
		sizes,
		setSizes
	};
}
//#endregion
export { createSplitPane };
