import { n as useRoomBinding } from "./_room-context-Cg1LI93i.js";
import { Draggable, ariaDrag, autoScroll, ghost, haptics, magnetic, marqueeSelect, onMove, scrollLock, snapGuides } from "@neodrag/core";
import { createEffect, createSignal, onCleanup } from "solid-js";
//#region src/index.ts
/**
* Solid v3 — `create*` primitives returning a `ref` setter + reactive state accessors.
*
* **Collab:** pass an `id` (and a `room`, or mount a `<RoomProvider>`) and the draggable auto-joins
* that room on mount and leaves on unmount — its committed position syncs as a `drag` op.
*/
function createDraggable(options = {}) {
	const [isDragging, set_dragging] = createSignal(false);
	let inst = null;
	const { join, leave } = useRoomBinding(options.room);
	const handles = /* @__PURE__ */ new Map();
	const cancels = /* @__PURE__ */ new Map();
	const position_two_way = Boolean(Object.getOwnPropertyDescriptor(options, "position")?.set);
	const build = () => ({
		...options,
		onDragStart: (e) => {
			set_dragging(true);
			options.onDragStart?.(e);
		},
		onDrag: (e) => {
			if (position_two_way) options.position = e.offset;
			options.onDrag?.(e);
		},
		onDragEnd: (e) => {
			set_dragging(false);
			options.onDragEnd?.(e);
		}
	});
	const ref = (node) => {
		leave();
		inst?.destroy();
		inst = new Draggable(node, build());
		join(inst, options.id);
		for (const [n, e] of handles) e.off = inst.registerHandle(n, { priority: e.priority });
		for (const [n, e] of cancels) e.off = inst.registerCancel(n, { priority: e.priority });
		onCleanup(() => {
			leave();
			for (const e of handles.values()) e.off = null;
			for (const e of cancels.values()) e.off = null;
			inst?.destroy();
			inst = null;
		});
	};
	createEffect(() => {
		const next = build();
		inst?.update(next);
	});
	const marker = (map, is_handle, priority) => {
		return (node) => {
			const entry = {
				priority,
				off: inst ? is_handle ? inst.registerHandle(node, { priority }) : inst.registerCancel(node, { priority }) : null
			};
			map.set(node, entry);
			onCleanup(() => {
				entry.off?.();
				map.delete(node);
			});
		};
	};
	const handle = (o) => marker(handles, true, o?.priority ?? 0);
	const cancel = (o) => marker(cancels, false, o?.priority ?? 0);
	return {
		ref,
		isDragging,
		handle,
		cancel
	};
}
//#endregion
export { ariaDrag, autoScroll, createDraggable, ghost, haptics, magnetic, marqueeSelect, onMove, scrollLock, snapGuides };
