import { isPointerInput, keyboardToInput } from "../interaction/index.js";
import { a as KEYBOARD_SENSOR_KEY, c as findKeyboardDragRoot, d as keyboardDraggable, f as SensorBase, i as KEYBOARD_MOVE_SENSOR_KEY, l as getKeyboardDragConfig, n as POINTER_SENSOR_KEY, o as KeyboardMoveSensor, r as PointerSensor, s as KeyboardSensor, t as installDefaultSensors, u as isDraggableKeyboardTarget } from "../defaults-BhzGhhsJ.js";
import { n as NativeDndSensor, t as NATIVE_DND_SENSOR_KEY } from "../native-dnd-CSmgQ2Lc.js";
//#region src/sensors/gamepad.ts
const GAMEPAD_SENSOR_KEY = Symbol("neodrag.sensor.gamepad");
const BUTTON_A = 0;
const BUTTON_B = 1;
const DPAD_UP = 12;
const DPAD_DOWN = 13;
const DPAD_LEFT = 14;
const DPAD_RIGHT = 15;
const AXIS_LX = 0;
const AXIS_LY = 1;
function center_of(node) {
	const rect = node.getBoundingClientRect();
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2
	};
}
function focused_root() {
	return findKeyboardDragRoot(typeof document !== "undefined" ? document.activeElement : null);
}
/**
* Polls connected gamepads each frame and maps the left stick + dpad to keyboard-style
* move inputs, A to grab/commit and B to cancel — driving the engine with the same
* `keyboardToInput` payloads the keyboard sensor uses, so a gamepad moves any node that's
* registered for keyboard dragging. The pad never claims a node directly; it grabs whatever
* keyboard-drag root currently holds focus, keeping it decoupled from the drag capability.
*/
var GamepadSensor = class GamepadSensor extends SensorBase {
	static key = GAMEPAD_SENSOR_KEY;
	key = GamepadSensor.key;
	#deadzone;
	#speed;
	#get_gamepads;
	#now;
	constructor(options = {}) {
		super();
		this.#deadzone = options?.deadzone ?? .25;
		this.#speed = options?.speed ?? 12;
		const provided = options?.getGamepads;
		this.#get_gamepads = provided ?? (() => typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : []);
		this.#now = options?.now ?? (() => performance.now());
	}
	attach(host) {
		const session = this.createSession(host);
		let rafId = requestAnimationFrame(function loop() {
			session.poll();
			rafId = requestAnimationFrame(loop);
		});
		return () => {
			if (rafId) cancelAnimationFrame(rafId);
			session.stop();
		};
	}
	/**
	* Build a poll-driven session without starting a rAF loop. `attach` uses this internally;
	* tests use it to step the sensor deterministically with an injected `getGamepads`/`now`.
	*/
	createSession(host) {
		let grab = null;
		let last_poll = this.#now();
		const prev_buttons = /* @__PURE__ */ new Map();
		const start_grab = (root) => {
			const config = getKeyboardDragConfig(root);
			if (!config) return;
			const center = center_of(root);
			grab = {
				node: root,
				clientX: center.x,
				clientY: center.y,
				config,
				carry_x: 0,
				carry_y: 0
			};
			host.onInteractionStart(keyboardToInput({
				phase: "start",
				clientX: grab.clientX,
				clientY: grab.clientY,
				key: config.grabKey,
				target: root
			}));
		};
		const commit_grab = () => {
			if (!grab) return;
			host.onInteractionEnd(keyboardToInput({
				phase: "end",
				clientX: grab.clientX,
				clientY: grab.clientY,
				key: grab.config.grabKey,
				target: grab.node
			}));
			grab = null;
		};
		const cancel_grab = () => {
			grab = null;
			host.cancelActive("cancel");
		};
		const emit_move = (g, dx, dy) => {
			if (dx === 0 && dy === 0) return;
			g.clientX += dx;
			g.clientY += dy;
			host.onInteractionMove(keyboardToInput({
				phase: "move",
				clientX: g.clientX,
				clientY: g.clientY,
				key: "Gamepad",
				delta: {
					x: dx,
					y: dy
				},
				target: g.node,
				repeat: true
			}));
		};
		const pressed_edge = (pad, index) => {
			const down = pad.buttons[index]?.pressed ?? false;
			const was = prev_buttons.get(index) ?? false;
			prev_buttons.set(index, down);
			return down && !was;
		};
		const apply_deadzone = (v) => {
			const mag = Math.abs(v);
			if (mag <= this.#deadzone) return 0;
			const scaled = (mag - this.#deadzone) / (1 - this.#deadzone);
			return Math.sign(v) * scaled;
		};
		const first_connected = () => {
			for (const p of this.#get_gamepads()) if (p && p.connected !== false) return p;
			return null;
		};
		const poll = () => {
			const now = this.#now();
			const dt = Math.max(0, (now - last_poll) / 1e3);
			last_poll = now;
			const pad = first_connected();
			if (!pad) {
				if (prev_buttons.size) prev_buttons.clear();
				return;
			}
			const a_edge = pressed_edge(pad, BUTTON_A);
			if (pressed_edge(pad, BUTTON_B) && grab) cancel_grab();
			else if (a_edge) if (grab) commit_grab();
			else {
				const root = focused_root();
				if (root) start_grab(root);
			}
			if (!grab) return;
			const config = grab.config;
			const axis = config.axis;
			let nx = apply_deadzone(pad.axes[AXIS_LX] ?? 0);
			let ny = apply_deadzone(pad.axes[AXIS_LY] ?? 0);
			if (pad.buttons[DPAD_LEFT]?.pressed) nx = -1;
			else if (pad.buttons[DPAD_RIGHT]?.pressed) nx = 1;
			if (pad.buttons[DPAD_UP]?.pressed) ny = -1;
			else if (pad.buttons[DPAD_DOWN]?.pressed) ny = 1;
			if (axis === "x") ny = 0;
			if (axis === "y") nx = 0;
			grab.carry_x += nx * this.#speed * dt;
			grab.carry_y += ny * this.#speed * dt;
			const steps_x = Math.trunc(grab.carry_x);
			const steps_y = Math.trunc(grab.carry_y);
			if (steps_x !== 0 || steps_y !== 0) {
				grab.carry_x -= steps_x;
				grab.carry_y -= steps_y;
				emit_move(grab, steps_x * config.step, steps_y * config.step);
			}
		};
		return {
			poll,
			stop() {
				prev_buttons.clear();
				grab = null;
			}
		};
	}
};
//#endregion
//#region src/sensors/filters.ts
function buttonFilter(buttons) {
	return (input) => {
		if (!isPointerInput(input)) return true;
		return buttons.includes(input.pointer.button);
	};
}
function modifierFilter(mods) {
	return (input) => {
		const m = input.modifiers;
		if (mods.shift !== void 0 && m.shift !== mods.shift) return false;
		if (mods.ctrl !== void 0 && m.ctrl !== mods.ctrl) return false;
		if (mods.alt !== void 0 && m.alt !== mods.alt) return false;
		if (mods.meta !== void 0 && m.meta !== mods.meta) return false;
		return true;
	};
}
function allFilters(...filters) {
	return (input) => filters.every((f) => f(input));
}
//#endregion
export { GAMEPAD_SENSOR_KEY, GamepadSensor, KEYBOARD_MOVE_SENSOR_KEY, KEYBOARD_SENSOR_KEY, KeyboardMoveSensor, KeyboardSensor, NATIVE_DND_SENSOR_KEY, NativeDndSensor, POINTER_SENSOR_KEY, PointerSensor, SensorBase, allFilters, buttonFilter, installDefaultSensors, isDraggableKeyboardTarget, keyboardDraggable, modifierFilter };
