import { i as LocalPresence, o as PresenceFrame, t as CollabOp } from "../collab-types-Y3M0X2KT.js";
import { u as Room } from "../index-knsTeVKP.js";
import { l as DragPlugin } from "../drag-CL5U3tM0.js";

//#region src/splitpane/splitpane.d.ts
/** Split direction: `'x'` lays panes out in a row (vertical gutters), `'y'` in a column. */
type SplitAxis = 'x' | 'y';
interface SplitPaneOptions {
  /** `'x'` (row, default) or `'y'` (column). */
  axis?: SplitAxis;
  /** Initial pane weights (relative `flex-grow`). Defaults to equal weights as panes register. */
  sizes?: number[];
  /** Minimum weight per pane — a single value for all, or one per pane. Default `0`. */
  minSizes?: number | number[];
  /** Stable string id — the `target` in the unified collab op grammar. Required in practice for
   * collab (it must match across peers); an auto id is peer-local. */
  id?: string;
  /** Fires once per gesture, on release, with the settled weights. */
  onResize?: (sizes: number[]) => void;
  /** Fires on every change (each move + programmatic set) — the live-binding seam. */
  onChange?: (sizes: number[]) => void;
  /** Pure op stream — `{ type: 'splitpane', target, sizes }` once per gesture that changes the
   * layout, on release. The last-write-wins seam `@neodrag/collab` subscribes to. */
  onCommit?: (op: CollabOp) => void;
}
/**
 * Framework-agnostic split-pane math. Holds the pane weights and redistributes a conserved budget
 * between two neighbours when a gutter is dragged — one grows by exactly what the other loses,
 * each clamped to its minimum. The DOM (applying `flex` to panes, making gutters draggable) is the
 * wrapper's job; this class never touches it.
 */
declare class SplitPaneController {
  #private;
  readonly axis: SplitAxis;
  sizes: number[];
  constructor(options?: SplitPaneOptions);
  /** The split's stable string id — the `target` in the unified op grammar. */
  get targetId(): string;
  get hasExplicitId(): boolean;
  /** Grow the tracked pane count to at least `n`, seeding new panes with weight `1`. */
  ensureCount(n: number): void;
  /** Replace all weights (programmatic / controlled set). */
  setSizes(sizes: number[]): void;
  /** Snapshot the weights at gesture start so the move is computed from a stable base. */
  beginGutter(): void;
  /**
   * Move `deltaPx` of the container's main axis from the pane after the gutter to the pane before
   * it (clamped so neither drops below its minimum). `containerPx` converts px → weight.
   */
  dragGutter(index: number, deltaPx: number, containerPx: number): void;
  /** End the gesture; emit the settled weights and (if changed) a commit op. */
  endGutter(): void;
  /** The Room only ever passes `{ id }`. */
  update(options: {
    id?: string;
  }): void;
  onCommit(fn: (op: CollabOp) => void): () => void;
  onPresence(fn: (p: LocalPresence | null) => void): () => void;
  /** Apply a remote split-pane fact — set the layout. A no-op while a local gesture owns it (the
   * local commit wins, last-write-wins). Foreign kinds ignored. */
  applyExternal(op: CollabOp): void;
  /** Render a remote peer's in-flight drag — set the live layout (no-op during a local gesture). */
  showRemotePresence(frame: PresenceFrame): void;
  clearRemotePresence(): void;
}
/**
 * Drag plugin for the gutter between pane `index` and `index + 1`. It reads the gutter's drag offset
 * (a `Draggable` on that axis), maps it to a neighbour-pair resize, and returns `{ x: 0, y: 0 }` so
 * the gutter itself never translates — the flex layout repositions it as the panes change. Spread
 * the gutter element with a `Draggable({ axis, use: [splitGutter(...)] })`.
 */
declare function splitGutter(controller: SplitPaneController, index: number, containerPx: () => number): DragPlugin;
/**
 * Framework-agnostic, DOM-aware split-pane binder. Register the wrapper with `container(el)`, each
 * pane with `pane(el, i)`, and each divider with `gutter(el, i)` (between pane `i` and `i + 1`) — each
 * returns a disposer, so elements bind independently and in any order. The container becomes a flex
 * row/column, panes carry the live `flex` weight, and a gutter is a one-axis `Draggable` running the
 * `splitGutter` plugin. Read live weights from `sizes`. Framework wrappers map the register methods to
 * refs/attachments and mirror `onChange`; vanilla uses it directly. Pass a `room` to sync the layout.
 */
declare class SplitPane {
  #private;
  readonly axis: SplitAxis;
  constructor(options?: SplitPaneOptions & {
    room?: Room;
  });
  /** Live pane weights (the controller's array — copy before mutating). */
  get sizes(): number[];
  /** Programmatically set the weights (e.g. a reset or a preset layout). */
  setSizes(sizes: number[]): void;
  /** Register the container element. Returns a disposer. */
  container(el: HTMLElement): () => void;
  /** Register pane `index`. Returns a disposer. */
  pane(el: HTMLElement, index: number): () => void;
  /** Register the gutter between pane `index` and `index + 1`. Returns a disposer. */
  gutter(el: HTMLElement, index: number): () => void;
}
//#endregion
export { type SplitAxis, SplitPane, SplitPaneController, type SplitPaneOptions, splitGutter };