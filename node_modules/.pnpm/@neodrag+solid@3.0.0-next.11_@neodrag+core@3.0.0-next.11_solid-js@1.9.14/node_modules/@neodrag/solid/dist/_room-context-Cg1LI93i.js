import { createContext, useContext } from "solid-js";
//#region src/_room-context.ts
/**
* The room a `<RoomProvider>` supplies, or `undefined` when none is mounted (collab is opt-in, so the
* capability primitives just skip their join). This module holds only a context handle + type-only
* `Room` references — importing it never pulls the heavy `Room` orchestrator into the bundle (that
* lives behind `@neodrag/solid/collab`), so `createSortable` without collab stays lean.
*/
const RoomContext = createContext();
/**
* Raw (non-reactive) access to the ambient room — capability primitives use this to `add` their
* instance. For reactive presence UI (`peers`/`presences`) use `useRoom()` from `@neodrag/solid/collab`.
*/
function useRoomContext() {
	return useContext(RoomContext);
}
/**
* Resolves the room from the `room` option or the ambient `<RoomProvider>`, and returns `join`/`leave`
* to call from the `ref` setter, co-located with the instance create + its `onCleanup`. `leave` is the
* per-target disposer (idempotent).
*/
function useRoomBinding(option_room) {
	const room = option_room ?? useRoomContext();
	let off = null;
	const join = (instance, id) => {
		off = room?.add(instance, id) ?? null;
	};
	const leave = () => {
		off?.();
		off = null;
	};
	return {
		join,
		leave
	};
}
//#endregion
export { useRoomBinding as n, useRoomContext as r, RoomContext as t };
