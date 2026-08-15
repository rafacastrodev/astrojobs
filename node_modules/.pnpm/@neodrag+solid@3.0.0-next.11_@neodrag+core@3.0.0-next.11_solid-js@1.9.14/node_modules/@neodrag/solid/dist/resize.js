import { n as useRoomBinding } from "./_room-context-Cg1LI93i.js";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { RESIZE_EDGES, RESIZE_HANDLE_ATTR, RESIZE_HANDLE_ATTR as RESIZE_HANDLE_ATTR$1, Resizable, Resizable as Resizable$1, preserveUnits } from "@neodrag/core/resize";
//#region src/resize.ts
function createResizable(options = {}) {
	const [isResizing, set_resizing] = createSignal(false);
	const [size, set_size] = createSignal(void 0);
	const [position, set_position] = createSignal(void 0);
	let inst = null;
	const { join, leave } = useRoomBinding(options.room);
	const build = () => ({
		...options,
		onResizeStart: (e) => {
			set_resizing(true);
			set_size({
				width: e.width,
				height: e.height
			});
			set_position({
				x: e.x,
				y: e.y
			});
			options.onResizeStart?.(e);
		},
		onResize: (e) => {
			set_size({
				width: e.width,
				height: e.height
			});
			set_position({
				x: e.x,
				y: e.y
			});
			options.onResize?.(e);
		},
		onResizeEnd: (e) => {
			set_resizing(false);
			set_size({
				width: e.width,
				height: e.height
			});
			set_position({
				x: e.x,
				y: e.y
			});
			options.onResizeEnd?.(e);
		}
	});
	const ref = (node) => {
		leave();
		inst?.destroy();
		inst = new Resizable$1(node, build());
		join(inst, options.id);
		onCleanup(() => {
			leave();
			inst?.destroy();
			inst = null;
		});
	};
	createEffect(() => {
		inst?.update(build());
	});
	return {
		ref,
		handle: (edge) => ({ [RESIZE_HANDLE_ATTR$1]: edge }),
		isResizing,
		size,
		position
	};
}
//#endregion
export { RESIZE_EDGES, RESIZE_HANDLE_ATTR, Resizable, createResizable, preserveUnits };
