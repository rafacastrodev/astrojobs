import { n as is_svg_element } from "./utils-BRN9X2Lx.js";
//#region src/lib/inverse-scale.ts
function inverseScaleFromNode(node, layoutRect) {
	let scale = 1;
	if (is_svg_element(node)) {
		const bbox = node.getBBox();
		if (bbox.width && layoutRect.width) scale = bbox.width / layoutRect.width;
	} else {
		const el = node;
		if (layoutRect.width) scale = el.offsetWidth / layoutRect.width;
	}
	return Number.isFinite(scale) && scale > 0 ? scale : 1;
}
//#endregion
export { inverseScaleFromNode as t };
