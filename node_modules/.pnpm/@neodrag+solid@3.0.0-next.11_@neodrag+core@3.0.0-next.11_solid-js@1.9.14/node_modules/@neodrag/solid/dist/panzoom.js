import { createSignal, onCleanup } from "solid-js";
import { PanZoom } from "@neodrag/core/panzoom";
//#region src/panzoom.ts
/**
* Pan/zoom canvas primitive — a thin adapter over the core `PanZoom` binder (which owns the pan
* drag, wheel/pinch zoom, and the world transform). Put `viewport` on the clipping element's `ref`
* and `world` on the inner content layer's `ref`; read live `scale()` / `x()` / `y()` / `transform()`.
*/
function createPanZoom(options = {}) {
	const [transform, set_transform] = createSignal({
		x: options.x ?? 0,
		y: options.y ?? 0,
		scale: options.scale ?? 1
	});
	const inst = new PanZoom({
		...options,
		onChange: (t) => set_transform(t)
	});
	let v_dispose = null;
	const viewport = (node) => {
		v_dispose?.();
		v_dispose = node ? inst.viewport(node) : null;
	};
	let w_dispose = null;
	const world = (node) => {
		w_dispose?.();
		w_dispose = node ? inst.world(node) : null;
	};
	const zoomBy = (factor, cx, cy) => inst.zoomBy(factor, cx, cy);
	const zoomTo = (scale, cx, cy) => inst.zoomTo(scale, cx, cy);
	const panBy = (dx, dy) => inst.panBy(dx, dy);
	const setTransform = (t) => inst.setTransform(t);
	const reset = () => inst.reset();
	onCleanup(() => {
		v_dispose?.();
		v_dispose = null;
		w_dispose?.();
		w_dispose = null;
	});
	return {
		viewport,
		world,
		scale: () => transform().scale,
		x: () => transform().x,
		y: () => transform().y,
		transform,
		zoomBy,
		zoomTo,
		panBy,
		setTransform,
		reset
	};
}
//#endregion
export { createPanZoom };
