//#region src/extend/marquee.ts
/** Do two axis-aligned rects overlap? Pure. */
function rectsOverlap(a, b) {
	return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
/**
* Rubber-band selection as a `use: []` drag plugin — a real engine gesture, not a bolt-on. Put a
* `Draggable` on the region; dragging it draws a marquee (the region never translates — the plugin
* returns `{ x: 0, y: 0 }`) and reports the items it touches via `onSelect` (fired each move). The
* drag anchor is recovered as `pointer − offset`, so no per-gesture state is captured.
*
* `getItems` returns the selectable elements (re-read at each gesture start).
*/
function marqueeSelect(getItems, onSelect, options = {}) {
	const draw = options.box ?? true;
	let items = [];
	let box = null;
	return {
		name: "marquee-select",
		onStart: () => {
			const list = getItems();
			items = Array.from({ length: list.length }, (_, i) => list[i]);
			if (draw) {
				box = document.createElement("div");
				box.style.cssText = "position:fixed;z-index:2147483646;pointer-events:none;background:var(--neodrag-marquee-fill,color-mix(in srgb,#3b82f6 18%,transparent));border:1px solid var(--neodrag-marquee-stroke,#3b82f6);";
				document.body.appendChild(box);
			}
		},
		onMove: ({ offset, input }) => {
			const ax = input.clientX - offset.x;
			const ay = input.clientY - offset.y;
			const rect = {
				left: Math.min(ax, input.clientX),
				top: Math.min(ay, input.clientY),
				right: Math.max(ax, input.clientX),
				bottom: Math.max(ay, input.clientY)
			};
			if (box) {
				box.style.left = `${rect.left}px`;
				box.style.top = `${rect.top}px`;
				box.style.width = `${rect.right - rect.left}px`;
				box.style.height = `${rect.bottom - rect.top}px`;
			}
			const hit = [];
			for (const el of items) if (rectsOverlap(rect, el.getBoundingClientRect())) hit.push(el);
			onSelect(hit);
			return {
				x: 0,
				y: 0
			};
		},
		onEnd: () => {
			box?.remove();
			box = null;
		}
	};
}
//#endregion
export { rectsOverlap as n, marqueeSelect as t };
