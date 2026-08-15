import { t as Ref } from "./_internal-B_qrKGUN.js";
import { Accessor } from "solid-js";
import { RESIZE_EDGES, RESIZE_HANDLE_ATTR, Resizable, ResizeBoundsInput, ResizeEdge, ResizeEdge as ResizeEdge$1, ResizeEventData, ResizeHandleProps, ResizeHandleProps as ResizeHandleProps$1, ResizeOptions, ResizeOptions as ResizeOptions$1, preserveUnits } from "@neodrag/core/resize";
import { Room } from "@neodrag/core/collab";

//#region src/resize.d.ts
declare function createResizable(options?: ResizeOptions$1 & {
  room?: Room;
}): {
  ref: Ref;
  handle: (edge: ResizeEdge$1) => ResizeHandleProps$1;
  isResizing: Accessor<boolean>;
  size: Accessor<{
    width: number;
    height: number;
  } | undefined>;
  position: Accessor<{
    x: number;
    y: number;
  } | undefined>;
};
//#endregion
export { RESIZE_EDGES, RESIZE_HANDLE_ATTR, Resizable, type ResizeBoundsInput, type ResizeEdge, type ResizeEventData, type ResizeHandleProps, type ResizeOptions, createResizable, preserveUnits };