import { keyboardToInput, pointerToInput } from "./interaction/index.js";
import { i as listen, n as is_svg_element, r as is_svg_svg_element } from "./utils-BRN9X2Lx.js";
//#region src/sensors/base.ts
var SensorBase = class {
	setup(host) {
		return this.attach(host);
	}
};
//#endregion
//#region src/sensors/keyboard.ts
const registry = /* @__PURE__ */ new WeakMap();
function registerKeyboardDrag(node, options) {
	registry.set(node, options);
}
function unregisterKeyboardDrag(node) {
	registry.delete(node);
}
function getKeyboardDragConfig(node) {
	return registry.get(node);
}
function findKeyboardDragRoot(target) {
	let el = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
	while (el) {
		if (registry.has(el)) return el;
		el = el.parentElement;
	}
	const active = document.activeElement;
	if (active instanceof HTMLElement && registry.has(active)) return active;
	return null;
}
function startKeyboardRepeat(opts) {
	let raf_id = 0;
	let last_tick = 0;
	let started_at = 0;
	let stopped = false;
	let fast = false;
	const loop = (now) => {
		if (stopped) return;
		if (!started_at) started_at = now;
		const interval = fast ? opts.fastInterval : opts.slowInterval;
		if (!fast && now - started_at >= opts.speedupDelay) {
			fast = true;
			last_tick = now;
		}
		if (now - last_tick >= interval) {
			last_tick = now;
			opts.onTick(fast);
		}
		raf_id = requestAnimationFrame(loop);
	};
	raf_id = requestAnimationFrame(loop);
	return { stop() {
		stopped = true;
		if (raf_id) cancelAnimationFrame(raf_id);
	} };
}
const KEYBOARD_SENSOR_KEY = Symbol("neodrag.sensor.keyboard");
var KeyboardSensor = class KeyboardSensor extends SensorBase {
	static key = KEYBOARD_SENSOR_KEY;
	key = KeyboardSensor.key;
	#cancel_keys;
	constructor(options = {}) {
		super();
		this.#cancel_keys = new Set(options?.cancelKeys ?? ["Escape"]);
	}
	attach(host) {
		const target = host.getDelegate();
		const on_key_down = (e) => {
			if (!this.#cancel_keys.has(e.key)) return;
			host.cancelActive("cancel");
		};
		return listen(target, "keydown", on_key_down, { passive: true });
	}
};
const KEYBOARD_MOVE_SENSOR_KEY = Symbol("neodrag.sensor.keyboardMove");
const ARROW_KEYS = new Set([
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight"
]);
function axis_delta(key, step, axis) {
	let x = 0;
	let y = 0;
	if (key === "ArrowLeft") x = -step;
	else if (key === "ArrowRight") x = step;
	else if (key === "ArrowUp") y = -step;
	else if (key === "ArrowDown") y = step;
	else return null;
	if (axis === "x") y = 0;
	if (axis === "y") x = 0;
	return {
		x,
		y
	};
}
function center_of(node) {
	const rect = node.getBoundingClientRect();
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2
	};
}
function is_grab_key(key, grab_key) {
	return key === grab_key || grab_key === "Space" && key === " ";
}
var KeyboardMoveSensor = class KeyboardMoveSensor extends SensorBase {
	static key = KEYBOARD_MOVE_SENSOR_KEY;
	key = KeyboardMoveSensor.key;
	attach(host) {
		const target = host.getDelegate();
		let grab = null;
		const stop_repeat = () => {
			grab?.repeat?.stop();
			if (grab) grab.repeat = null;
		};
		const emit_move = (session, key, fast) => {
			const delta = axis_delta(key, fast ? session.config.fastStep : session.config.step, session.config.axis);
			if (!delta) return;
			session.clientX += delta.x;
			session.clientY += delta.y;
			host.onInteractionMove(keyboardToInput({
				phase: "move",
				clientX: session.clientX,
				clientY: session.clientY,
				key,
				delta,
				target: session.node,
				repeat: true
			}));
		};
		const release_grab = () => {
			if (!grab) return;
			stop_repeat();
			host.onInteractionEnd(keyboardToInput({
				phase: "end",
				clientX: grab.clientX,
				clientY: grab.clientY,
				key: grab.config.grabKey,
				target: grab.node
			}));
			grab = null;
		};
		const on_key_down = (e) => {
			if (e.defaultPrevented) return;
			if (e.key === "Escape" && grab) {
				e.preventDefault();
				stop_repeat();
				grab = null;
				host.cancelActive("cancel");
				return;
			}
			const root = findKeyboardDragRoot(e.target);
			if (!root) {
				if (grab && is_grab_key(e.key, grab.config.grabKey)) {
					e.preventDefault();
					release_grab();
				}
				return;
			}
			const config = getKeyboardDragConfig(root);
			if (is_grab_key(e.key, config.grabKey)) {
				e.preventDefault();
				if (grab?.node === root) {
					release_grab();
					return;
				}
				if (grab) release_grab();
				const center = center_of(root);
				grab = {
					node: root,
					clientX: center.x,
					clientY: center.y,
					config,
					repeat: null,
					last_key: config.grabKey
				};
				host.onInteractionStart(keyboardToInput({
					phase: "start",
					clientX: grab.clientX,
					clientY: grab.clientY,
					key: e.key,
					target: root,
					native: e
				}));
				return;
			}
			if (!grab || grab.node !== root) return;
			if (!ARROW_KEYS.has(e.key)) return;
			e.preventDefault();
			grab.last_key = e.key;
			stop_repeat();
			if (!e.repeat) {
				emit_move(grab, e.key, false);
				return;
			}
			grab.repeat = startKeyboardRepeat({
				slowInterval: config.slowInterval,
				speedupDelay: config.speedupDelay,
				fastInterval: config.fastInterval,
				onTick: (fast) => {
					if (!grab) return;
					emit_move(grab, grab.last_key, fast);
				}
			});
		};
		const on_blur = () => {
			if (grab) release_grab();
		};
		const unlisten_key_down = listen(target, "keydown", on_key_down, { passive: false });
		const unlisten_blur = listen(target, "blur", on_blur, {
			passive: true,
			capture: true
		});
		return () => {
			stop_repeat();
			grab = null;
			unlisten_key_down();
			unlisten_blur();
		};
	}
};
function isDraggableKeyboardTarget(el) {
	return (el instanceof HTMLElement || is_svg_element(el) && !is_svg_svg_element(el)) && getKeyboardDragConfig(el) != null;
}
function resolve(options) {
	return {
		grabKey: options.grabKey ?? "Space",
		step: options.step ?? 1,
		fastStep: options.fastStep ?? 4,
		axis: options.axis ?? null,
		slowInterval: options.slowInterval ?? 400,
		speedupDelay: options.speedupDelay ?? 800,
		fastInterval: options.fastInterval ?? 50
	};
}
/**
* Register `node` so the {@link KeyboardMoveSensor} (and {@link GamepadSensor}) can grab and
* move it — the engine then routes the resulting inputs to whichever capability owns the node
* (e.g. `Drag`). This is the v3 port of the legacy `keyboardDrag` plugin: it does the same
* registry registration, minus the plugin lifecycle and unit-resolution plumbing.
*
* Ensure the node is focusable (`tabindex`) so it can receive the grab keystroke.
*/
function keyboardDraggable(node, options = {}) {
	let current = options;
	registerKeyboardDrag(node, resolve(current));
	return {
		update(next) {
			current = next;
			registerKeyboardDrag(node, resolve(current));
		},
		destroy() {
			unregisterKeyboardDrag(node);
		}
	};
}
//#endregion
//#region src/sensors/pointer.ts
const POINTER_SENSOR_KEY = Symbol("neodrag.sensor.pointer");
var PointerSensor = class PointerSensor extends SensorBase {
	static key = POINTER_SENSOR_KEY;
	key = PointerSensor.key;
	#buttons;
	constructor(options = {}) {
		super();
		this.#buttons = options?.buttons ?? [0];
	}
	attach(host) {
		const target = host.getDelegate();
		let armed = false;
		let move_up_abort = null;
		const disarm = () => {
			move_up_abort?.abort();
			move_up_abort = null;
			armed = false;
		};
		host.setPointerDisarm(disarm);
		const arm = () => {
			if (armed) return;
			armed = true;
			const signal = (move_up_abort = new AbortController()).signal;
			listen(target, "pointermove", (e) => host.onInteractionMove(pointerToInput(e, "move")), {
				passive: false,
				capture: true,
				signal
			});
			const on_up = (e) => {
				disarm();
				host.onInteractionEnd(pointerToInput(e, "end"));
			};
			listen(target, "pointerup", on_up, {
				passive: true,
				capture: true,
				signal
			});
			listen(target, "pointercancel", on_up, {
				passive: true,
				capture: true,
				signal
			});
		};
		const on_pointer_down = (e) => {
			if (!this.#buttons.includes(e.button)) return;
			host.onInteractionStart(pointerToInput(e, "start"));
			arm();
		};
		const unlisten = listen(target, "pointerdown", on_pointer_down, {
			passive: true,
			capture: true
		});
		return () => {
			host.setPointerDisarm(null);
			disarm();
			unlisten();
		};
	}
};
//#endregion
//#region src/sensors/defaults.ts
function installDefaultSensors(register) {
	register(new PointerSensor());
	register(new KeyboardSensor());
	register(new KeyboardMoveSensor());
}
//#endregion
export { KEYBOARD_SENSOR_KEY as a, findKeyboardDragRoot as c, keyboardDraggable as d, SensorBase as f, KEYBOARD_MOVE_SENSOR_KEY as i, getKeyboardDragConfig as l, POINTER_SENSOR_KEY as n, KeyboardMoveSensor as o, PointerSensor as r, KeyboardSensor as s, installDefaultSensors as t, isDraggableKeyboardTarget as u };
