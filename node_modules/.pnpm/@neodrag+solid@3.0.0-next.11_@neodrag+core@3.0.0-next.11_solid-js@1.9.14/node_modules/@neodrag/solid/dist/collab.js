import { r as useRoomContext, t as RoomContext } from "./_room-context-Cg1LI93i.js";
import { createComponent, createSignal, onCleanup } from "solid-js";
import { Room } from "@neodrag/core/collab";
export * from "@neodrag/core/collab";
//#region src/collab.ts
/**
* Provides a room to every capability primitive rendered below it — they auto-join (and leave on
* cleanup). Pass `room` to share an existing one, or `backend` to have the provider create and own it.
*/
function RoomProvider(props) {
	const room = props.room ?? new Room(props.backend, {
		presenceThrottleMs: props.presenceThrottleMs,
		presenceTtlMs: props.presenceTtlMs,
		onRemotePresence: props.onRemotePresence,
		onRemoteOp: props.onRemoteOp,
		mirror: props.mirror
	});
	if (!props.room) onCleanup(() => room.destroy());
	return createComponent(RoomContext.Provider, {
		value: room,
		get children() {
			return props.children;
		}
	});
}
/**
* Reactive view of the ambient room — `peers` (connected ids) and `presences` (their in-flight
* gestures) are accessors that update as peers join, move and leave. Use for avatars, "N editing",
* remote cursors. Pass a room or rely on an ancestor `<RoomProvider>`.
*/
function useRoom(room) {
	const active = room ?? useRoomContext();
	if (!active) throw new Error("`useRoom()` needs a room — pass one or mount a <RoomProvider>.");
	const [peers, set_peers] = createSignal(active.peers);
	const [presences, set_presences] = createSignal(active.presences);
	onCleanup(active.subscribe(() => {
		set_peers(active.peers);
		set_presences(active.presences);
	}));
	return {
		room: active,
		peers,
		presences
	};
}
//#endregion
export { RoomProvider, useRoom, useRoomContext };
