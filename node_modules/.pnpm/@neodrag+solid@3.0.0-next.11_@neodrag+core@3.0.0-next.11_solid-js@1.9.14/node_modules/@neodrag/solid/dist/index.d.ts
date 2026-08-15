import { AriaDragAnnounce, AriaDragOptions, AutoScrollOptions, Axis, BoundsInput, DragEventData, DragOptions, DragOptions as DragOptions$1, DragPlugin, GhostOptions, MagneticOptions, MagneticSpring, MarqueeOptions, ScrollLockOptions, SnapGuidesOptions, ariaDrag, autoScroll, ghost, haptics, magnetic, marqueeSelect, onMove, scrollLock, snapGuides } from "@neodrag/core";
import { Accessor } from "solid-js";
import { Room } from "@neodrag/core/collab";

//#region src/index.d.ts
type Ref = (node: HTMLElement) => void;
/**
 * Solid v3 — `create*` primitives returning a `ref` setter + reactive state accessors.
 *
 * **Collab:** pass an `id` (and a `room`, or mount a `<RoomProvider>`) and the draggable auto-joins
 * that room on mount and leaves on unmount — its committed position syncs as a `drag` op.
 */
declare function createDraggable(options?: DragOptions$1 & {
  room?: Room;
}): {
  ref: Ref;
  isDragging: Accessor<boolean>;
  handle: (opts?: {
    priority?: number;
  }) => Ref;
  cancel: (opts?: {
    priority?: number;
  }) => Ref;
};
//#endregion
export { type AriaDragAnnounce, type AriaDragOptions, type AutoScrollOptions, type Axis, type BoundsInput, type DragEventData, type DragOptions, type DragPlugin, type GhostOptions, type MagneticOptions, type MagneticSpring, type MarqueeOptions, type ScrollLockOptions, type SnapGuidesOptions, ariaDrag, autoScroll, createDraggable, ghost, haptics, magnetic, marqueeSelect, onMove, scrollLock, snapGuides };