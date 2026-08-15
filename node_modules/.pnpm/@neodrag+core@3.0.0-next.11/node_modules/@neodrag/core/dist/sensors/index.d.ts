import { d as InteractionInput, i as SensorHost, n as PointerSensorOptions, o as DndNode, r as Sensor, t as KeyboardSensorOptions } from "../types-G2NWiUm6.js";

//#region src/sensors/base.d.ts
declare abstract class SensorBase implements Sensor {
  abstract readonly key: symbol;
  setup(host: SensorHost): () => void;
  protected abstract attach(host: SensorHost): () => void;
}
//#endregion
//#region src/sensors/pointer.d.ts
declare const POINTER_SENSOR_KEY: unique symbol;
declare class PointerSensor extends SensorBase {
  #private;
  static readonly key: symbol;
  readonly key: symbol;
  constructor(options?: PointerSensorOptions | null);
  protected attach(host: SensorHost): () => void;
}
//#endregion
//#region src/sensors/native-dnd.d.ts
declare const NATIVE_DND_SENSOR_KEY: unique symbol;
/**
 * Bridges the browser's native OS drag-and-drop (files / selected text) into the engine as a
 * `native-dnd` interaction. `dragover` must `preventDefault()` or the browser never fires `drop`.
 * A dragenter/dragleave depth counter distinguishes moving *between* elements (which fires both)
 * from actually leaving the document — only the latter ends the interaction.
 */
declare class NativeDndSensor extends SensorBase {
  static readonly key: symbol;
  readonly key: symbol;
  protected attach(host: SensorHost): () => void;
}
//#endregion
//#region src/sensors/keyboard.d.ts
type KeyboardDragAxis = 'x' | 'y' | null;
declare const KEYBOARD_SENSOR_KEY: unique symbol;
declare class KeyboardSensor extends SensorBase {
  #private;
  static readonly key: symbol;
  readonly key: symbol;
  constructor(options?: KeyboardSensorOptions | null);
  protected attach(host: SensorHost): () => void;
}
declare const KEYBOARD_MOVE_SENSOR_KEY: unique symbol;
declare class KeyboardMoveSensor extends SensorBase {
  static readonly key: symbol;
  readonly key: symbol;
  protected attach(host: SensorHost): () => void;
}
declare function isDraggableKeyboardTarget(el: Element): el is HTMLElement | SVGElement;
/**
 * Options for making a node keyboard- (and gamepad-) movable. A pixel `step` only here —
 * the v3 surface is options-only and px-based; any unit resolution lives in the framework
 * adapters, not the engine.
 */
interface KeyboardDraggableOptions {
  /** Key (or 'Space') that grabs / releases the node. Default 'Space'. */
  grabKey?: string;
  /** Pixels moved per arrow press (slow phase). Default 1. */
  step?: number;
  /** Pixels per tick once auto-repeat speeds up. Default 4. */
  fastStep?: number;
  /** Constrain movement to a single axis. Default null (free). */
  axis?: KeyboardDragAxis;
  /** ms between repeats before speed-up kicks in. Default 400. */
  slowInterval?: number;
  /** ms a key must be held before repeats speed up. Default 800. */
  speedupDelay?: number;
  /** ms between repeats after speed-up. Default 50. */
  fastInterval?: number;
}
/** Handle for a keyboard-draggable registration — update the config or tear it down. */
interface KeyboardDraggableHandle {
  update(options: KeyboardDraggableOptions): void;
  destroy(): void;
}
/**
 * Register `node` so the {@link KeyboardMoveSensor} (and {@link GamepadSensor}) can grab and
 * move it — the engine then routes the resulting inputs to whichever capability owns the node
 * (e.g. `Drag`). This is the v3 port of the legacy `keyboardDrag` plugin: it does the same
 * registry registration, minus the plugin lifecycle and unit-resolution plumbing.
 *
 * Ensure the node is focusable (`tabindex`) so it can receive the grab keystroke.
 */
declare function keyboardDraggable(node: DndNode, options?: KeyboardDraggableOptions): KeyboardDraggableHandle;
//#endregion
//#region src/sensors/defaults.d.ts
declare function installDefaultSensors(register: (sensor: Sensor) => void): void;
//#endregion
//#region src/sensors/gamepad.d.ts
declare const GAMEPAD_SENSOR_KEY: unique symbol;
interface GamepadSensorOptions {
  /** Stick magnitude below this is treated as centered. Default 0.25. */
  deadzone?: number;
  /**
   * Velocity at full stick deflection, in `step` units per second. The accumulated
   * sub-pixel travel is flushed to whole `step` moves so a half-held stick still moves.
   * Default 12 (≈12 steps/s wide-open).
   */
  speed?: number;
  /**
   * Inject a poll source for testing (defaults to `navigator.getGamepads`). Lets a test
   * feed a mocked gamepad without a real device or `navigator`.
   */
  getGamepads?: () => (Gamepad | null)[];
  /** Inject a clock for testing (defaults to `performance.now`). */
  now?: () => number;
}
/** A live gamepad-driving session: `poll()` advances one frame, `stop()` tears it down. */
interface GamepadSession {
  poll(): void;
  stop(): void;
}
/**
 * Polls connected gamepads each frame and maps the left stick + dpad to keyboard-style
 * move inputs, A to grab/commit and B to cancel — driving the engine with the same
 * `keyboardToInput` payloads the keyboard sensor uses, so a gamepad moves any node that's
 * registered for keyboard dragging. The pad never claims a node directly; it grabs whatever
 * keyboard-drag root currently holds focus, keeping it decoupled from the drag capability.
 */
declare class GamepadSensor extends SensorBase {
  #private;
  static readonly key: symbol;
  readonly key: symbol;
  constructor(options?: GamepadSensorOptions | null);
  protected attach(host: SensorHost): () => void;
  /**
   * Build a poll-driven session without starting a rAF loop. `attach` uses this internally;
   * tests use it to step the sensor deterministically with an injected `getGamepads`/`now`.
   */
  createSession(host: SensorHost): GamepadSession;
}
//#endregion
//#region src/sensors/filters.d.ts
type InputFilter = (input: InteractionInput) => boolean;
declare function buttonFilter(buttons: number[]): InputFilter;
declare function modifierFilter(mods: {
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
}): InputFilter;
declare function allFilters(...filters: InputFilter[]): InputFilter;
//#endregion
export { GAMEPAD_SENSOR_KEY, GamepadSensor, type GamepadSensorOptions, type GamepadSession, type InputFilter, KEYBOARD_MOVE_SENSOR_KEY, KEYBOARD_SENSOR_KEY, type KeyboardDraggableHandle, type KeyboardDraggableOptions, KeyboardMoveSensor, KeyboardSensor, type KeyboardSensorOptions, NATIVE_DND_SENSOR_KEY, NativeDndSensor, POINTER_SENSOR_KEY, PointerSensor, type PointerSensorOptions, type Sensor, SensorBase, type SensorHost, allFilters, buttonFilter, installDefaultSensors, isDraggableKeyboardTarget, keyboardDraggable, modifierFilter };