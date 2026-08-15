import { t as Interactions } from "../engine-Dr5fQvhL.js";

//#region src/dev/inspector.d.ts
interface InteractionInspectorOptions {
  mount?: HTMLElement;
  title?: string;
}
interface InteractionInspector {
  refresh(): void;
  destroy(): void;
}
declare function createInteractionInspector(engine: Interactions, options?: InteractionInspectorOptions): InteractionInspector;
declare function installInteractionInspector(engine: Interactions, options?: InteractionInspectorOptions): InteractionInspector;
//#endregion
export { type InteractionInspector, type InteractionInspectorOptions, createInteractionInspector, installInteractionInspector };