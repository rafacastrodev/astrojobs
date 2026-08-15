//#region src/transform.ts
/**
* Translate applier for the core. Position is the sum of independent per-capability
* contributions keyed by a `symbol`: drag writes its offset, resize writes the position
* shift a `w`/`n` edge induces (to pin the far edge). They compose on one node without
* clobbering each other — the module sums every contribution and writes one `translate`.
*
* Pure side effect, idempotent (skips the DOM write when the composed value is unchanged),
* caches kept in WeakMaps (not Symbol props on the node — per the validated teardown), and
* no ghost/markup special-casing. Legacy 3-arg callers (sortable, ghost) land on a shared
* `DEFAULT` key, preserving their single-contributor behaviour.
*/
const SVG_TRANSLATE = typeof SVGTransform !== "undefined" ? SVGTransform.SVG_TRANSFORM_TRANSLATE : 2;
/** Capability key for a translate contribution. Same key → same contribution slot. */
const TRANSLATE_DEFAULT = Symbol("neodrag.translate.default");
const TRANSLATE_DRAG = Symbol("neodrag.translate.drag");
const TRANSLATE_RESIZE = Symbol("neodrag.translate.resize");
/** Per-node contributions, and the last-applied composed sum (for the idempotent skip). */
const parts = /* @__PURE__ */ new WeakMap();
const applied = /* @__PURE__ */ new WeakMap();
function applyTranslate(node, x, y, key = TRANSLATE_DEFAULT) {
	let map = parts.get(node);
	if (!map) {
		map = /* @__PURE__ */ new Map();
		parts.set(node, map);
	}
	const prev = map.get(key);
	if (prev) {
		if (prev.x === x && prev.y === y) return;
		prev.x = x;
		prev.y = y;
	} else map.set(key, {
		x,
		y
	});
	compose(node, map);
}
/**
* Remove a translate contribution. With a `key`, drop just that capability's part and re-compose
* the rest; without one, clear the node entirely (legacy whole-node reset used by sortable/ghost).
*/
function clearTranslate(node, key) {
	const map = parts.get(node);
	if (!map) return;
	if (key !== void 0 && map.size > 1) {
		if (!map.delete(key)) return;
		compose(node, map);
		return;
	}
	parts.delete(node);
	applied.delete(node);
	write_translate(node, 0, 0, true);
}
function compose(node, map) {
	let x = 0;
	let y = 0;
	for (const part of map.values()) {
		x += part.x;
		y += part.y;
	}
	const prev = applied.get(node);
	if (prev && prev.x === x && prev.y === y) return;
	if (prev) {
		prev.x = x;
		prev.y = y;
	} else applied.set(node, {
		x,
		y
	});
	write_translate(node, x, y, false);
}
function write_translate(node, x, y, clear) {
	if (node instanceof SVGElement) {
		const el = node;
		const list = el.transform?.baseVal;
		if (!list) return;
		if (clear) {
			for (let i = list.numberOfItems - 1; i >= 0; i--) if (list.getItem(i).type === SVG_TRANSLATE) list.removeItem(i);
			return;
		}
		const svg = el.ownerSVGElement;
		if (!svg) return;
		for (let i = 0; i < list.numberOfItems; i++) if (list.getItem(i).type === SVG_TRANSLATE) {
			list.getItem(i).setTranslate(x, y);
			return;
		}
		const t = svg.createSVGTransform();
		t.setTranslate(x, y);
		list.insertItemBefore(t, 0);
		return;
	}
	node.style.translate = clear ? "" : `${x}px ${y}px`;
}
//#endregion
export { clearTranslate as i, TRANSLATE_RESIZE as n, applyTranslate as r, TRANSLATE_DRAG as t };
