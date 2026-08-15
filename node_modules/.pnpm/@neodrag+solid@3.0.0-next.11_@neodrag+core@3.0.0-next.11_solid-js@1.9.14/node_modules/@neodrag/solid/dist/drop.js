import { n as useRoomBinding } from "./_room-context-Cg1LI93i.js";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { Droppable, Droppable as Droppable$1, REMOTE_HOVER_ATTR, REMOTE_HOVER_MARKER_ATTR } from "@neodrag/core/drop";
//#region src/drop.ts
function createDroppable(options = {}) {
	const [isOver, set_over] = createSignal(false);
	let inst = null;
	const { join, leave } = useRoomBinding(options.room);
	const build = () => ({
		...options,
		onEnter: (e) => {
			set_over(true);
			options.onEnter?.(e);
		},
		onLeave: (e) => {
			set_over(false);
			options.onLeave?.(e);
		}
	});
	const ref = (node) => {
		leave();
		inst?.destroy();
		inst = new Droppable$1(node, build());
		join(inst, options.id);
		onCleanup(() => {
			leave();
			inst?.destroy();
			inst = null;
		});
	};
	createEffect(() => {
		const next = build();
		inst?.update(next);
	});
	return {
		ref,
		isOver
	};
}
//#endregion
export { Droppable, REMOTE_HOVER_ATTR, REMOTE_HOVER_MARKER_ATTR, createDroppable };
