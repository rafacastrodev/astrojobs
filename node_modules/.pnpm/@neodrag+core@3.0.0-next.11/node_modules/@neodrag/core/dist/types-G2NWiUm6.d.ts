//#region src/interaction-input.d.ts
type InteractionKind = 'pointer' | 'keyboard' | 'programmatic' | 'native-dnd';
type InteractionPhase = 'start' | 'move' | 'end';
declare const KEYBOARD_POINTER_ID = -1;
declare const NATIVE_POINTER_ID = -2;
type InteractionModifiers = Readonly<{
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  meta: boolean;
}>;
type InteractionPointerMeta = Readonly<{
  pointerId: number;
  pointerType: PointerEvent['pointerType'];
  button: number;
  buttons: number;
  pressure?: number;
}>;
type InteractionKeyboardMeta = Readonly<{
  key: string;
  code: string;
  repeat: boolean;
}>;
interface InteractionInputBase {
  readonly phase: InteractionPhase;
  readonly clientX: number;
  readonly clientY: number;
  readonly target: EventTarget | null;
  readonly modifiers: InteractionModifiers;
  readonly timestamp: number;
  readonly delta?: Readonly<{
    x: number;
    y: number;
  }>;
}
type PointerInteractionInput = InteractionInputBase & {
  readonly kind: 'pointer';
  readonly native: PointerEvent;
  readonly pointer: InteractionPointerMeta;
};
type KeyboardInteractionInput = InteractionInputBase & {
  readonly kind: 'keyboard';
  readonly native: KeyboardEvent | null;
  readonly keyboard: InteractionKeyboardMeta;
  readonly pointerId: number;
};
type ProgrammaticInteractionInput = InteractionInputBase & {
  readonly kind: 'programmatic';
  readonly pointerId: number;
  readonly source?: string;
};
/** An OS drag-and-drop (files/text) routed through the engine by the native-DnD sensor. There is
 * no draggable node — `dataTransfer` carries the payload (readable only on the `drop` phase). */
type NativeDndInteractionInput = InteractionInputBase & {
  readonly kind: 'native-dnd';
  readonly native: DragEvent;
  readonly dataTransfer: DataTransfer | null;
  readonly pointerId: number;
};
type InteractionInput = PointerInteractionInput | KeyboardInteractionInput | ProgrammaticInteractionInput | NativeDndInteractionInput;
declare function modifiersFromPointer(e: PointerEvent): InteractionModifiers;
declare function modifiersFromKeyboard(e: KeyboardEvent): InteractionModifiers;
declare function pointerToInput(native: PointerEvent, phase: InteractionPhase, delta?: {
  x: number;
  y: number;
}): PointerInteractionInput;
declare function keyboardToInput(opts: {
  phase: InteractionPhase;
  clientX: number;
  clientY: number;
  key: string;
  code?: string;
  repeat?: boolean;
  delta?: {
    x: number;
    y: number;
  };
  target?: EventTarget | null;
  native?: KeyboardEvent | null;
  modifiers?: Partial<InteractionModifiers>;
  pointerId?: number;
  timestamp?: number;
}): KeyboardInteractionInput;
declare function programmaticToInput(opts: {
  phase: InteractionPhase;
  clientX: number;
  clientY: number;
  pointerId?: number;
  delta?: {
    x: number;
    y: number;
  };
  target?: EventTarget | null;
  source?: string;
  timestamp?: number;
}): ProgrammaticInteractionInput;
declare function nativeDragToInput(native: DragEvent, phase: InteractionPhase): NativeDndInteractionInput;
/** The OS-drop payload — readable only on `drop` (the spec hides file/text content during hover). */
declare function nativeDropFiles(dt: DataTransfer | null): File[];
declare function nativeDropText(dt: DataTransfer | null): string;
declare function isNativeDndInput(i: InteractionInput): i is NativeDndInteractionInput;
declare function isPointerInput(i: InteractionInput): i is PointerInteractionInput;
declare function isKeyboardInput(i: InteractionInput): i is KeyboardInteractionInput;
declare function isProgrammaticInput(i: InteractionInput): i is ProgrammaticInteractionInput;
declare function nativePointerEvent(i: InteractionInput | null | undefined): PointerEvent | null;
declare function interactionPointerId(i: InteractionInput): number;
declare function submitInteraction(host: SensorHost, input: InteractionInput): void;
//#endregion
//#region src/types.d.ts
type EndReason = 'drop' | 'no-target' | 'cancel';
type DndNode = HTMLElement | SVGElement;
/** What a capability returns when it claims a pointerdown. `data` is capability-private. */
interface ResolvedTarget {
  node: DndNode;
  data?: unknown;
}
/** The live interaction the engine drives, handed to the owning capability each phase. */
interface InteractionSession {
  readonly capability: Capability;
  readonly target: ResolvedTarget;
  readonly pointerId: number;
  readonly startInput: InteractionInput;
  /** Latest input for this interaction. */
  input: InteractionInput;
  /** Shared payload set by the owning capability (e.g. drag data), read by observers. */
  data?: unknown;
  /** True once the threshold gate has passed and `start()` has run. */
  started: boolean;
  /**
   * Whether the engine suppresses body text-selection (`user-select: none`, refcounted) for the
   * lifetime of this interaction. Defaults to `true` for every gesture; a capability sets it
   * `false` in `start()` (e.g. from a `userSelect: false` option) to opt out.
   */
  userSelect?: boolean;
  /** End this interaction from inside a capability (commit/cancel). */
  end(reason: EndReason): void;
}
/**
 * A capability is a peer interaction (drag, drop substrate, resize, sortable, …).
 * The engine knows nothing about their semantics — it only routes pointer input
 * to whichever capability claims a node, then drives the lifecycle.
 */
interface Capability {
  readonly key: symbol;
  readonly name: string;
  /** Higher runs first in pointerdown routing (e.g. resize-handle > drag-body). Default 0. */
  readonly priority?: number;
  /** Claim a pointerdown: return the bound target this capability owns, or null to pass. */
  resolve(input: InteractionInput): ResolvedTarget | null;
  /** Threshold gate, checked on each pending move. Return false to stay pending. Default: pass. */
  shouldStart?(session: InteractionSession): boolean;
  /** Runs once when the threshold passes. */
  start(session: InteractionSession): void;
  /** Runs on every move after start. */
  move(session: InteractionSession): void;
  /** Runs once on pointerup/cancel. */
  end(session: InteractionSession, reason: EndReason): void;
  /**
   * Optional: observe interactions owned by *another* capability (e.g. `drop` watching a
   * `drag` session to hit-test zones). Keeps capabilities decoupled — `drag` never imports
   * `drop`; `drop` opts into the stream. Fires after the owner's own start/move/end.
   */
  observe?(session: InteractionSession, phase: 'start' | 'move' | 'end', reason?: EndReason): void;
}
interface InteractionsOptions {
  /** Element to delegate the single document-level listeners on. Default: documentElement. */
  delegate?: () => HTMLElement;
  /** Install pointer + keyboard sensors automatically. Default: true. */
  defaultSensors?: boolean;
}
//#endregion
//#region src/sensors/types.d.ts
interface SensorHost {
  getDelegate(): HTMLElement;
  setPointerDisarm(disarm: (() => void) | null): void;
  onInteractionStart(input: InteractionInput): void;
  onInteractionMove(input: InteractionInput): void;
  onInteractionEnd(input: InteractionInput): void;
  cancelActive(reason: EndReason): void;
}
interface Sensor {
  readonly key: symbol;
  setup(host: SensorHost): () => void;
}
interface PointerSensorOptions {
  /** Mouse buttons that may start an interaction (0 = left). Default: [0] */
  buttons?: number[];
}
interface KeyboardSensorOptions {
  /** Keys that cancel the active interaction. Default: ['Escape'] */
  cancelKeys?: string[];
}
//#endregion
export { modifiersFromKeyboard as A, ProgrammaticInteractionInput as C, isPointerInput as D, isNativeDndInput as E, nativePointerEvent as F, pointerToInput as I, programmaticToInput as L, nativeDragToInput as M, nativeDropFiles as N, isProgrammaticInput as O, nativeDropText as P, submitInteraction as R, PointerInteractionInput as S, isKeyboardInput as T, InteractionPointerMeta as _, Capability as a, NATIVE_POINTER_ID as b, InteractionSession as c, InteractionInput as d, InteractionInputBase as f, InteractionPhase as g, InteractionModifiers as h, SensorHost as i, modifiersFromPointer as j, keyboardToInput as k, InteractionsOptions as l, InteractionKind as m, PointerSensorOptions as n, DndNode as o, InteractionKeyboardMeta as p, Sensor as r, EndReason as s, KeyboardSensorOptions as t, ResolvedTarget as u, KEYBOARD_POINTER_ID as v, interactionPointerId as w, NativeDndInteractionInput as x, KeyboardInteractionInput as y };