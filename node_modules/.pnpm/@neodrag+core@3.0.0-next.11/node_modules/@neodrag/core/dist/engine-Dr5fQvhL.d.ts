import { a as Capability, c as InteractionSession, i as SensorHost, l as InteractionsOptions, r as Sensor } from "./types-G2NWiUm6.js";

//#region src/engine.d.ts
/**
 * The semantics-free engine. It owns only the shared machinery — single document-level
 * sensor delegation, the session state, and routing pointer input to whichever capability
 * claims a node — and knows nothing about drag/drop/resize. Capabilities provide meaning.
 */
declare class Interactions {
  #private;
  readonly host: SensorHost;
  constructor(options?: InteractionsOptions);
  /** The active interaction, or null. Read-only view for capabilities/debug. */
  get session(): InteractionSession | null;
  /** Compose capabilities into the engine. Returns `this` for chaining. */
  use(...capabilities: Capability[]): this;
  registerSensor(sensor: Sensor): this;
  dispose(): void;
}
//#endregion
export { Interactions as t };