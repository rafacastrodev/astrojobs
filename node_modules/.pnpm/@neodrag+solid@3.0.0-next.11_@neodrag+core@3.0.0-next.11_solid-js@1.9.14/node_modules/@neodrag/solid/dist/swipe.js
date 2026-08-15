import { createSignal, onCleanup } from "solid-js";
import { Swipeable, resolveSwipe } from "@neodrag/core/swipe";
//#region src/swipe.ts
/**
* Swipe-to-dismiss primitive — a thin adapter over the core `Swipeable` binder. Put `ref` on the
* element; read `offset()` / `isDismissed()`. Released past `threshold` the element flies out and
* fires `onDismiss`, otherwise it springs back.
*/
function createSwipe(options = {}) {
	let inst = null;
	let dispose = null;
	const [offset, set_offset] = createSignal({
		x: 0,
		y: 0
	});
	const [isDismissed, set_dismissed] = createSignal(false);
	const ref = (node) => {
		dispose?.();
		dispose = null;
		inst = null;
		if (node) {
			inst = new Swipeable({
				...options,
				onChange: (s) => {
					set_offset(s.offset);
					set_dismissed(s.dismissed);
				}
			});
			dispose = inst.attach(node);
		}
	};
	onCleanup(() => {
		dispose?.();
		dispose = null;
		inst = null;
	});
	const reset = () => inst?.reset();
	return {
		ref,
		offset,
		isDismissed,
		reset
	};
}
//#endregion
export { createSwipe, resolveSwipe };
