import { t as Ref } from "./_internal-B_qrKGUN.js";
import { Accessor } from "solid-js";
import { ROTATE_HANDLE_ATTR, Rotatable, RotateEventData, RotateHandlePos, RotateHandlePos as RotateHandlePos$1, RotateHandleProps, RotateHandleProps as RotateHandleProps$1, RotateOptions, RotateOptions as RotateOptions$1, RotateOrigin } from "@neodrag/core/rotate";
import { Room } from "@neodrag/core/collab";

//#region src/rotate.d.ts
/**
 * Rotate primitive. Put `ref` on the element and spread `{...handle('top')}` on the rotate grip.
 * `angle` (degrees) + `isRotating` come back as accessors.
 *
 * **Collab:** pass an `id` (and a `room`, or mount a `<RoomProvider>`) and rotation syncs live.
 */
declare function createRotatable(options?: RotateOptions$1 & {
  room?: Room;
}): {
  ref: Ref;
  handle: (pos?: RotateHandlePos$1) => RotateHandleProps$1;
  isRotating: Accessor<boolean>;
  angle: Accessor<number>;
};
//#endregion
export { ROTATE_HANDLE_ATTR, Rotatable, type RotateEventData, type RotateHandlePos, type RotateHandleProps, type RotateOptions, type RotateOrigin, createRotatable };