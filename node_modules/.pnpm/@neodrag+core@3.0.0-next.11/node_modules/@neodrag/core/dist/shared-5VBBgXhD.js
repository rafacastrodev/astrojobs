import { interactionPointerId, isPointerInput } from "./interaction/index.js";
import { t as installDefaultSensors } from "./defaults-BhzGhhsJ.js";
//#region src/user-select.ts
/**
* Suppress text selection on the document while an interaction is mid-flight — the "user-select
* hack". Shared by every interaction (drag, resize, sortable, …) so any of them can opt in with a
* `userSelect` option.
*
* Refcounted, hence stateful: the body's original `user-select` is saved once, on the first claim,
* and restored once, on the last release. That keeps two concurrent interactions (a drag in one
* widget, a resize in another) from clearing the hack out from under each other. Pair every `apply`
* with exactly one `release` — callers that didn't apply (option turned off) must NOT release.
*/
var UserSelectHack = class {
	#claims = 0;
	#saved_body_user_select = "";
	/** Claim the hack. Sets `user-select: none` on the body the first time it's held. */
	apply() {
		if (typeof document === "undefined") return;
		if (this.#claims === 0) {
			const body = document.body;
			this.#saved_body_user_select = body.style.userSelect;
			body.style.userSelect = "none";
			body.style.setProperty("-webkit-user-select", "none");
		}
		this.#claims += 1;
	}
	/** Release one claim. Restores the body's original `user-select` once the last claim drops. */
	release() {
		if (typeof document === "undefined" || this.#claims === 0) return;
		this.#claims -= 1;
		if (this.#claims === 0) {
			const body = document.body;
			body.style.userSelect = this.#saved_body_user_select;
			body.style.removeProperty("-webkit-user-select");
		}
	}
};
/** Process-wide singleton — one body, one shared refcount across every interaction. */
const userSelectHack = new UserSelectHack();
//#endregion
//#region src/engine.ts
const default_delegate = () => document.documentElement;
/**
* The semantics-free engine. It owns only the shared machinery — single document-level
* sensor delegation, the session state, and routing pointer input to whichever capability
* claims a node — and knows nothing about drag/drop/resize. Capabilities provide meaning.
*/
var Interactions = class {
	#capabilities = [];
	#sensors = [];
	#cleanups = /* @__PURE__ */ new Map();
	#delegate;
	#default_sensors;
	host;
	#observers = [];
	#sensors_installed = false;
	#pointer_disarm = null;
	#session = null;
	#active_pointer_id = null;
	#captured_node = null;
	#captured_pointer_id = -1;
	constructor(options = {}) {
		this.#delegate = options.delegate ?? default_delegate;
		this.#default_sensors = options.defaultSensors !== false;
		this.host = {
			getDelegate: () => this.#delegate(),
			setPointerDisarm: (disarm) => {
				this.#pointer_disarm = disarm;
			},
			onInteractionStart: (input) => this.#on_start(input),
			onInteractionMove: (input) => this.#on_move(input),
			onInteractionEnd: (input) => this.#on_end(input),
			cancelActive: (reason) => {
				if (this.#session) this.#finish(reason);
			}
		};
	}
	/** The active interaction, or null. Read-only view for capabilities/debug. */
	get session() {
		return this.#session;
	}
	/** Compose capabilities into the engine. Returns `this` for chaining. */
	use(...capabilities) {
		for (const cap of capabilities) this.#capabilities.push(cap);
		this.#capabilities.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
		this.#observers = this.#capabilities.filter((c) => typeof c.observe === "function");
		this.#ensure_sensors();
		return this;
	}
	registerSensor(sensor) {
		if (!this.#sensors.some((s) => s.key === sensor.key)) this.#sensors.push(sensor);
		if (this.#sensors_installed && !this.#cleanups.has(sensor.key)) this.#cleanups.set(sensor.key, sensor.setup(this.host));
		return this;
	}
	dispose() {
		if (this.#session) this.#finish("cancel");
		for (const cleanup of this.#cleanups.values()) cleanup();
		this.#cleanups.clear();
		this.#sensors_installed = false;
		this.#pointer_disarm = null;
	}
	#ensure_sensors() {
		if (this.#sensors_installed) return;
		this.#sensors_installed = true;
		if (this.#default_sensors && this.#sensors.length === 0) installDefaultSensors((sensor) => this.#sensors.push(sensor));
		for (const sensor of this.#sensors) if (!this.#cleanups.has(sensor.key)) this.#cleanups.set(sensor.key, sensor.setup(this.host));
	}
	#on_start(input) {
		if (this.#session) return;
		if (isPointerInput(input) && input.pointer.button === 2) return;
		for (const capability of this.#capabilities) {
			const target = capability.resolve(input);
			if (!target) continue;
			this.#active_pointer_id = interactionPointerId(input);
			this.#session = {
				capability,
				target,
				pointerId: this.#active_pointer_id,
				startInput: input,
				input,
				started: false,
				end: (reason) => this.#finish(reason)
			};
			return;
		}
	}
	#on_move(input) {
		const session = this.#session;
		if (!session) return;
		if (this.#active_pointer_id !== null && interactionPointerId(input) !== this.#active_pointer_id) return;
		session.input = input;
		if (!session.started) {
			if (!(session.capability.shouldStart?.(session) ?? true)) return;
			session.started = true;
			session.capability.start(session);
			if (session.userSelect !== false) userSelectHack.apply();
			if (isPointerInput(input)) try {
				const node = session.target.node;
				node.setPointerCapture?.(input.pointer.pointerId);
				this.#captured_node = node;
				this.#captured_pointer_id = input.pointer.pointerId;
			} catch {}
			this.#notify(session, "start");
		}
		session.capability.move(session);
		this.#notify(session, "move");
	}
	#on_end(input) {
		const session = this.#session;
		if (!session) return;
		if (this.#active_pointer_id !== null && interactionPointerId(input) !== this.#active_pointer_id) return;
		session.input = input;
		this.#finish("no-target");
	}
	#finish(reason) {
		const session = this.#session;
		if (!session) return;
		this.#session = null;
		this.#active_pointer_id = null;
		this.#release_capture();
		if (session.started) {
			session.capability.end(session, reason);
			if (session.userSelect !== false) userSelectHack.release();
			this.#notify(session, "end", reason);
		}
		this.#pointer_disarm?.();
	}
	#release_capture() {
		const node = this.#captured_node;
		if (!node) return;
		const id = this.#captured_pointer_id;
		this.#captured_node = null;
		this.#captured_pointer_id = -1;
		try {
			if (node.hasPointerCapture?.(id)) node.releasePointerCapture?.(id);
		} catch {}
	}
	#notify(session, phase, reason) {
		if (this.#observers.length === 0) return;
		for (const observer of this.#observers) {
			if (observer === session.capability) continue;
			observer.observe?.(session, phase, reason);
		}
	}
};
//#endregion
//#region src/shared.ts
/**
* Process-wide shared engine for the ergonomic single-element classes (`Draggable`,
* `Droppable`, …). All of them register into ONE `Interactions` so capabilities can observe each
* other (drop watches drag). Keyed by capability class, so importing only `Draggable`
* references only `Drag` — `Drop`/`Resize` stay out of the bundle (tree-shaking).
*/
let engine = null;
const capabilities = /* @__PURE__ */ new Map();
function sharedEngine() {
	return engine ??= new Interactions();
}
function sharedCapability(token, make) {
	let cap = capabilities.get(token);
	if (!cap) {
		cap = make();
		capabilities.set(token, cap);
		sharedEngine().use(cap);
	}
	return cap;
}
//#endregion
export { sharedEngine as n, Interactions as r, sharedCapability as t };
