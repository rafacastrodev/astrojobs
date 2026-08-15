import { n as useRoomBinding } from "./_room-context-Cg1LI93i.js";
import { createEffect, onCleanup } from "solid-js";
import { SORTABLE_KEY_ATTR, SORTABLE_KEY_ATTR as SORTABLE_KEY_ATTR$1, SortableList, SortableList as SortableList$1 } from "@neodrag/core/sortable";
//#region src/sortable.ts
/**
* Sortable primitive. Put `ref` on the container and spread `{...row(item.id)}` on each item instead
* of hand-writing `data-neodrag-sortable-key`. Pass `items` (and any option) as a getter to keep it live.
*
* **Collab:** pass an `id` (and a `room`, or mount a `<RoomProvider>`) and reorders sync live.
*/
function createSortable(options) {
	let inst = null;
	const { join, leave } = useRoomBinding(options.room);
	const ref = (node) => {
		leave();
		inst?.destroy();
		inst = new SortableList$1(node, { ...options });
		join(inst, options.id);
		onCleanup(() => {
			leave();
			inst?.destroy();
			inst = null;
		});
	};
	createEffect(() => {
		const next = { ...options };
		inst?.update(next);
	});
	return {
		ref,
		row: (key) => ({ [SORTABLE_KEY_ATTR$1]: key })
	};
}
//#endregion
export { SORTABLE_KEY_ATTR, SortableList, createSortable };
