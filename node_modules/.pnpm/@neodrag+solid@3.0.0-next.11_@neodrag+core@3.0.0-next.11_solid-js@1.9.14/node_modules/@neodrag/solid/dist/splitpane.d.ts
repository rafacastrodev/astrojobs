import { Accessor } from "solid-js";
import { Room } from "@neodrag/core/collab";
import { SplitAxis, SplitPaneOptions, SplitPaneOptions as SplitPaneOptions$1 } from "@neodrag/core/splitpane";

//#region src/splitpane.d.ts
type RefSetter = (node: HTMLElement | null) => void;
/**
 * Split-pane primitive — a thin adapter over the core `SplitPane` binder. Put `container` on the
 * wrapper's `ref`, `pane(i)` on each pane's `ref`, and `gutter(i)` on each divider's `ref` (the
 * gutter between pane `i` and `i + 1`). `sizes()` is the live array of weights. Nests: each call is
 * independent. Pass a `room` to sync the layout.
 */
declare function createSplitPane(options?: SplitPaneOptions$1 & {
  room?: Room;
}): {
  container: RefSetter;
  pane: (index: number) => RefSetter;
  gutter: (index: number) => RefSetter;
  sizes: Accessor<number[]>;
  setSizes: (sizes: number[]) => void;
};
//#endregion
export { type SplitAxis, type SplitPaneOptions, createSplitPane };