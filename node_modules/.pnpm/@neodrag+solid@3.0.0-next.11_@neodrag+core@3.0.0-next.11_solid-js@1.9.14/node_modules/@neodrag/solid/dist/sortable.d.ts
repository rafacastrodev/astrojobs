import { t as Ref } from "./_internal-B_qrKGUN.js";
import { MoveOp, SORTABLE_KEY_ATTR, SortAxis, SortStrategy, SortableList, SortableOp, SortableOptions, SortableOptions as SortableOptions$1, SortableRow, SortableRow as SortableRow$1, TransferContainer, TransferOp } from "@neodrag/core/sortable";
import { Room } from "@neodrag/core/collab";

//#region src/sortable.d.ts
/**
 * Sortable primitive. Put `ref` on the container and spread `{...row(item.id)}` on each item instead
 * of hand-writing `data-neodrag-sortable-key`. Pass `items` (and any option) as a getter to keep it live.
 *
 * **Collab:** pass an `id` (and a `room`, or mount a `<RoomProvider>`) and reorders sync live.
 */
declare function createSortable<T = unknown>(options: SortableOptions$1<T> & {
  room?: Room;
}): {
  ref: Ref;
  row: (key: string) => SortableRow$1;
};
//#endregion
export { type MoveOp, SORTABLE_KEY_ATTR, type SortAxis, type SortStrategy, SortableList, type SortableOp, type SortableOptions, type SortableRow, type TransferContainer, type TransferOp, createSortable };