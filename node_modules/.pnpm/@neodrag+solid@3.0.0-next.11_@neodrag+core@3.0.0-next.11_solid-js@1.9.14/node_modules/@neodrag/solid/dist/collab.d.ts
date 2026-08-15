import { Accessor, JSX } from "solid-js";
import { CollabBackend, PresenceFrame, Room, RoomOptions } from "@neodrag/core/collab";
export * from "@neodrag/core/collab";

//#region src/_room-context.d.ts
/**
 * Raw (non-reactive) access to the ambient room — capability primitives use this to `add` their
 * instance. For reactive presence UI (`peers`/`presences`) use `useRoom()` from `@neodrag/solid/collab`.
 */
declare function useRoomContext(): Room | undefined;
//#endregion
//#region src/collab.d.ts
type RoomProviderProps = {
  /** Use an existing room (you own its lifetime — the provider won't destroy it). */room?: Room; /** Create a room from this backend (destroyed when the provider unmounts). */
  backend?: CollabBackend;
  children?: JSX.Element;
} & RoomOptions;
/**
 * Provides a room to every capability primitive rendered below it — they auto-join (and leave on
 * cleanup). Pass `room` to share an existing one, or `backend` to have the provider create and own it.
 */
declare function RoomProvider(props: RoomProviderProps): JSX.Element;
/**
 * Reactive view of the ambient room — `peers` (connected ids) and `presences` (their in-flight
 * gestures) are accessors that update as peers join, move and leave. Use for avatars, "N editing",
 * remote cursors. Pass a room or rely on an ancestor `<RoomProvider>`.
 */
declare function useRoom(room?: Room): {
  room: Room;
  peers: Accessor<readonly string[]>;
  presences: Accessor<ReadonlyMap<string, PresenceFrame>>;
};
//#endregion
export { RoomProvider, RoomProviderProps, useRoom, useRoomContext };