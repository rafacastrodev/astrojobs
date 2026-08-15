import { n as useRoomBinding } from "./_room-context-Cg1LI93i.js";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { ROTATE_HANDLE_ATTR, ROTATE_HANDLE_ATTR as ROTATE_HANDLE_ATTR$1, Rotatable, Rotatable as Rotatable$1 } from "@neodrag/core/rotate";
//#region src/rotate.ts
/**
* Rotate primitive. Put `ref` on the element and spread `{...handle('top')}` on the rotate grip.
* `angle` (degrees) + `isRotating` come back as accessors.
*
* **Collab:** pass an `id` (and a `room`, or mount a `<RoomProvider>`) and rotation syncs live.
*/
function createRotatable(options = {}) {
	const [isRotating, set_rotating] = createSignal(false);
	const [angle, set_angle] = createSignal(0);
	let inst = null;
	const { join, leave } = useRoomBinding(options.room);
	const build = () => ({
		...options,
		onRotateStart: (e) => {
			set_rotating(true);
			set_angle(e.angle);
			options.onRotateStart?.(e);
		},
		onRotate: (e) => {
			set_angle(e.angle);
			options.onRotate?.(e);
		},
		onRotateEnd: (e) => {
			set_rotating(false);
			set_angle(e.angle);
			options.onRotateEnd?.(e);
		}
	});
	const ref = (node) => {
		leave();
		inst?.destroy();
		inst = new Rotatable$1(node, build());
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
		handle: (pos = "top") => ({ [ROTATE_HANDLE_ATTR$1]: pos }),
		isRotating,
		angle
	};
}
//#endregion
export { ROTATE_HANDLE_ATTR, Rotatable, createRotatable };
