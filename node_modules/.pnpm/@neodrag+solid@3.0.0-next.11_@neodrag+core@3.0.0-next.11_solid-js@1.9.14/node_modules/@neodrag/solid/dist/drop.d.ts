import { t as Ref } from "./_internal-B_qrKGUN.js";
import { Accessor } from "solid-js";
import { CollisionPolicy, DropAcceptCtx, DropEventData, DropOptions, DropOptions as DropOptions$1, Droppable, REMOTE_HOVER_ATTR, REMOTE_HOVER_MARKER_ATTR } from "@neodrag/core/drop";
import { Room } from "@neodrag/core/collab";

//#region src/drop.d.ts
declare function createDroppable(options?: DropOptions$1 & {
  room?: Room;
}): {
  ref: Ref;
  isOver: Accessor<boolean>;
};
//#endregion
export { type CollisionPolicy, type DropAcceptCtx, type DropEventData, type DropOptions, Droppable, REMOTE_HOVER_ATTR, REMOTE_HOVER_MARKER_ATTR, createDroppable };