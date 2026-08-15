//#region src/utils.ts
function listen(el, type, listener, options) {
	el.addEventListener(type, listener, options);
	return () => el.removeEventListener(type, listener, options);
}
function is_svg_element(element) {
	return element instanceof SVGElement;
}
function is_svg_svg_element(element) {
	return element instanceof SVGSVGElement;
}
const GHOST_PRESENTATION_PROPS = [
	"display",
	"flex-direction",
	"align-items",
	"justify-content",
	"flex-wrap",
	"gap",
	"padding-top",
	"padding-right",
	"padding-bottom",
	"padding-left",
	"border-top",
	"border-right",
	"border-bottom",
	"border-left",
	"border-radius",
	"background",
	"color",
	"font",
	"font-size",
	"font-weight",
	"font-family",
	"line-height",
	"letter-spacing",
	"text-transform",
	"box-shadow",
	"box-sizing",
	"white-space"
];
function mirrorPresentationStyles(source, target) {
	const computed = getComputedStyle(source);
	for (const prop of GHOST_PRESENTATION_PROPS) target.style.setProperty(prop, computed.getPropertyValue(prop));
}
function mirrorPresentationTree(source, target) {
	if (source instanceof HTMLElement && target instanceof HTMLElement) mirrorPresentationStyles(source, target);
	const source_children = source.children;
	const target_children = target.children;
	for (let i = 0; i < source_children.length; i++) {
		const child = target_children[i];
		if (child) mirrorPresentationTree(source_children[i], child);
	}
}
let auto_id_counter = 0;
/** Peer-local auto id with a readable prefix (e.g. `autoId('rotate')` → `'rotate-1'`). Monotonic
*  within a session — distinct peers produce different ids, so anything synced across clients should
*  carry a stable user-supplied id instead. */
function autoId(prefix) {
	return `${prefix}-${++auto_id_counter}`;
}
const warned = /* @__PURE__ */ new Set();
/** `console.warn` a message at most once per `key` for the lifetime of the module — keeps repeated
*  misconfigurations (one per element) from flooding the console. */
function warnOnce(key, message) {
	if (warned.has(key)) return;
	warned.add(key);
	console.warn(message);
}
//#endregion
export { mirrorPresentationTree as a, listen as i, is_svg_element as n, warnOnce as o, is_svg_svg_element as r, autoId as t };
