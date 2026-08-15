//#region ../testing/src/mouse.ts
/**
* Simple click on an element
* @param element - The element or testing wrapper to click
* @example
* await clickElement(buttonLocator)
* await clickElement(getByTestId('submit-btn'))
*/
async function clickElement(element) {
	const coords = await getElementCoords(element);
	await mouseClick({
		x: coords.x,
		y: coords.y
	});
}
/**
* Global cursor position tracker
*/
let currentCursorPosition = {
	x: 0,
	y: 0
};
let isTrackingCursor = false;
/**
* Check if we're running in Vitest browser mode
*/
function isVitestBrowser$1() {
	return false;
}
/**
* Update the tracked cursor position
*/
function updateCursorPosition(x, y) {
	currentCursorPosition = {
		x,
		y
	};
	if (typeof window !== "undefined") window.trackedMousePosition = {
		x,
		y
	};
}
/**
* Initialize cursor position tracking by listening to mouse events
* Call this once at the beginning of your test setup
*/
function startCursorTracking() {
	if (isTrackingCursor) return;
	isTrackingCursor = true;
	if (typeof window !== "undefined") window.getTrackedMousePosition = () => ({ ...currentCursorPosition });
	document.addEventListener("mousemove", (event) => {
		updateCursorPosition(event.clientX, event.clientY);
	}, { passive: true });
	document.addEventListener("mouseenter", (event) => {
		updateCursorPosition(event.clientX, event.clientY);
	}, { passive: true });
}
/**
* Stop cursor position tracking and remove event listeners
*/
function stopCursorTracking() {
	if (!isTrackingCursor) return;
	isTrackingCursor = false;
	if (typeof window !== "undefined") {
		delete window.getTrackedMousePosition;
		delete window.trackedMousePosition;
	}
}
/**
* Get the current cursor position on the page
*
* @returns Object with x, y coordinates of the current cursor position
* @example
* const position = await getCursorPosition()
* console.log(`Cursor at: ${position.x}, ${position.y}`)
*/
async function getCursorPosition() {
	if (isVitestBrowser$1()) try {
		const result = await null.getMousePosition();
		if (result && typeof result.x === "number" && typeof result.y === "number") return {
			x: result.x,
			y: result.y
		};
	} catch (error) {
		console.warn("getMousePosition command failed, using tracked position:", error);
	}
	return { ...currentCursorPosition };
}
/**
* Get cursor position relative to a specific element
*
* @param element - The element to get relative position for
* @returns Object with x, y coordinates relative to the element
* @example
* const button = await page.getByRole('button').element()
* const relativePos = await getCursorPositionRelativeToElement(button)
*/
async function getCursorPositionRelativeToElement(element) {
	const cursorPos = await getCursorPosition();
	const rect = element.getBoundingClientRect();
	return {
		x: cursorPos.x - rect.left,
		y: cursorPos.y - rect.top
	};
}
/**
* Check if cursor is currently over an element
*
* @param element - The element to check
* @returns Promise<boolean> - true if cursor is over the element
* @example
* const button = await page.getByRole('button').element()
* const isHovered = await isCursorOverElement(button)
*/
async function isCursorOverElement(element) {
	const cursorPos = await getCursorPosition();
	const rect = element.getBoundingClientRect();
	return cursorPos.x >= rect.left && cursorPos.x <= rect.right && cursorPos.y >= rect.top && cursorPos.y <= rect.bottom;
}
/**
* Helper function to get element coordinates for mouse events
* Handles both raw DOM elements and testing library wrappers
*
* @param element - The element or testing wrapper to get coordinates for
* @returns Promise with x, y coordinates of the element center
* @example
* const button = page.getByRole('button')
* const coords = await getElementCoords(await button.element())
* await mouseClick(coords)
*/
async function getElementCoords(element) {
	const domElement = "element" in element && typeof element.element === "function" ? await element.element() : element;
	if (!domElement || typeof domElement.getBoundingClientRect !== "function") throw new Error("Invalid element provided to getElementCoords. Expected DOM Element or testing wrapper with element() method.");
	const rect = domElement.getBoundingClientRect();
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2
	};
}
/**
* Fallback function to dispatch mouse events using DOM APIs
* This works when custom commands are not available
*/
function dispatchMouseEvent(type, x, y, button = "left") {
	const buttonCode = button === "left" ? 0 : button === "right" ? 2 : 1;
	const event = new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		clientX: x,
		clientY: y,
		button: buttonCode,
		buttons: type === "mouseup" ? 0 : 1 << buttonCode,
		view: window
	});
	const elementAtPoint = document.elementFromPoint(x, y);
	if (elementAtPoint) elementAtPoint.dispatchEvent(event);
	else document.dispatchEvent(event);
}
/**
* Simulate a mouse down event on the specified element
* Works across all browsers (Chrome, Firefox, Safari) using Vitest commands
*
* @param element - The element or testing wrapper to mouse down on
* @param button - Mouse button to use (default: 'left')
* @example
* await mouseDown(buttonLocator)
* await mouseDown(buttonLocator, 'right')
*/
async function mouseDown(element, button = "left") {
	const coords = await getElementCoords(element);
	updateCursorPosition(coords.x, coords.y);
	if (isVitestBrowser$1()) try {
		await null.mouseDown(coords.x, coords.y, button);
		return;
	} catch (error) {
		console.warn("Custom mouseDown command failed, falling back to DOM events:", error);
	}
	dispatchMouseEvent("mousedown", coords.x, coords.y, button);
}
/**
* Simulate a mouse up event on the specified element
* Works across all browsers (Chrome, Firefox, Safari) using Vitest commands
*
* @param element - The element or testing wrapper to mouse up on
* @param button - Mouse button to use (default: 'left')
* @example
* await mouseUp(buttonLocator)
* await mouseUp(buttonLocator, 'right')
*/
async function mouseUp(element, button = "left") {
	const coords = await getElementCoords(element);
	updateCursorPosition(coords.x, coords.y);
	if (isVitestBrowser$1()) try {
		await null.mouseUp(coords.x, coords.y, button);
		return;
	} catch (error) {
		console.warn("Custom mouseUp command failed, falling back to DOM events:", error);
	}
	dispatchMouseEvent("mouseup", coords.x, coords.y, button);
}
/**
* Simulate mouse movement by delta coordinates from current position
* Works across all browsers (Chrome, Firefox, Safari) using Vitest commands
*
* @param deltaX - Horizontal movement distance in pixels
* @param deltaY - Vertical movement distance in pixels
* @param steps - Number of steps to interpolate the movement (default: 1)
* @example
* await mouseMove(100, 50) // Move 100px right, 50px down
* await mouseMove(-50, 0, 10) // Move 50px left with 10 smooth steps
*/
async function mouseMove(deltaX, deltaY, steps = 1) {
	const currentPos = await getCursorPosition();
	const targetX = currentPos.x + deltaX;
	const targetY = currentPos.y + deltaY;
	updateCursorPosition(targetX, targetY);
	if (isVitestBrowser$1()) try {
		await null.mouseMove(targetX, targetY, steps);
		return;
	} catch (error) {
		console.warn("Custom mouseMove command failed, falling back to DOM events:", error);
	}
	if (steps <= 1) dispatchMouseEvent("mousemove", targetX, targetY);
	else {
		const stepDeltaX = deltaX / steps;
		const stepDeltaY = deltaY / steps;
		for (let i = 1; i <= steps; i++) {
			const nextX = Math.round(currentPos.x + stepDeltaX * i);
			const nextY = Math.round(currentPos.y + stepDeltaY * i);
			dispatchMouseEvent("mousemove", nextX, nextY);
			updateCursorPosition(nextX, nextY);
			await new Promise((resolve) => setTimeout(resolve, 16));
		}
	}
}
/**
* Helper function to perform a complete mouse click sequence
* Works across all browsers (Chrome, Firefox, Safari) using Vitest commands
*
* @param options - Mouse options including x, y coordinates and button
* @example
* await mouseClick({ x: 100, y: 200 })
* await mouseClick({ x: 100, y: 200, button: 'right' })
*/
async function mouseClick(options) {
	const { x, y, button = "left", options: extraOptions } = options;
	updateCursorPosition(x, y);
	if (isVitestBrowser$1()) try {
		await null.mouseClick(x, y, button, extraOptions?.delay);
		return;
	} catch (error) {
		console.warn("Custom mouseClick command failed, falling back to DOM events:", error);
	}
	dispatchMouseEvent("mousemove", x, y);
	dispatchMouseEvent("mousedown", x, y, button);
	if (extraOptions?.delay) await new Promise((resolve) => setTimeout(resolve, extraOptions.delay));
	dispatchMouseEvent("mouseup", x, y, button);
	dispatchMouseEvent("click", x, y, button);
}
/**
* Simulate a double click at the specified coordinates
* Works across all browsers (Chrome, Firefox, Safari) using Vitest commands
*
* @param options - Mouse options including x, y coordinates
* @example
* await mouseDoubleClick({ x: 100, y: 200 })
*/
async function mouseDoubleClick(options) {
	const { x, y, button = "left" } = options;
	updateCursorPosition(x, y);
	if (isVitestBrowser$1()) try {
		await null.mouseDoubleClick(x, y, button);
		return;
	} catch (error) {
		console.warn("Custom mouseDoubleClick command failed, falling back to DOM events:", error);
	}
	await mouseClick({
		x,
		y,
		button
	});
	await new Promise((resolve) => setTimeout(resolve, 10));
	await mouseClick({
		x,
		y,
		button
	});
}
async function resolveDragElement(element) {
	if ("element" in element && typeof element.element === "function") return element.element();
	return element;
}
function dispatchPointer(target, type, x, y, buttons) {
	const props = {
		bubbles: true,
		cancelable: true,
		pointerId: navigator.userAgent.toLowerCase().includes("firefox") ? 0 : 1,
		width: 1,
		height: 1,
		pressure: buttons ? .5 : 0,
		tangentialPressure: 0,
		tiltX: 0,
		tiltY: 0,
		twist: 0,
		pointerType: "mouse",
		isPrimary: true,
		view: window,
		clientX: x,
		clientY: y,
		screenX: x,
		screenY: y,
		button: 0,
		buttons
	};
	const event = new PointerEvent(type, props);
	target.dispatchEvent(event);
	document.documentElement.dispatchEvent(event);
}
/**
* Pointer drag with optional hold (no pointerup) for testing in-flight drag/drop/sortable state.
*/
async function pointerDrag(element, delta, options = {}) {
	const { steps = 8, delay = 0, longpress = 0, release = true } = options;
	const domElement = await resolveDragElement(element);
	const origin = await getElementCoords(element);
	const startCoords = {
		x: origin.x,
		y: origin.y
	};
	const endCoords = {
		x: startCoords.x + delta.deltaX,
		y: startCoords.y + delta.deltaY
	};
	const isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
	const originalSetPointerCapture = HTMLElement.prototype.setPointerCapture;
	const originalReleasePointerCapture = HTMLElement.prototype.releasePointerCapture;
	if (isFirefox) {
		HTMLElement.prototype.setPointerCapture = function() {};
		HTMLElement.prototype.releasePointerCapture = function() {};
	}
	try {
		dispatchPointer(domElement, "pointermove", startCoords.x, startCoords.y, 0);
		await new Promise((resolve) => setTimeout(resolve, 1));
		dispatchPointer(domElement, "pointerdown", startCoords.x, startCoords.y, 1);
		if (longpress > 0) await new Promise((resolve) => setTimeout(resolve, longpress));
		if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
		for (let i = 1; i <= steps; i++) {
			const progress = i / steps;
			dispatchPointer(domElement, "pointermove", startCoords.x + delta.deltaX * progress, startCoords.y + delta.deltaY * progress, 1);
			await new Promise((resolve) => setTimeout(resolve, 1));
		}
		if (release) {
			await new Promise((resolve) => setTimeout(resolve, 1));
			dispatchPointer(domElement, "pointerup", endCoords.x, endCoords.y, 0);
		}
		updateCursorPosition(endCoords.x, endCoords.y);
		return endCoords;
	} finally {
		HTMLElement.prototype.setPointerCapture = originalSetPointerCapture;
		HTMLElement.prototype.releasePointerCapture = originalReleasePointerCapture;
	}
}
/** Move the held pointer to viewport coordinates (during an active pointerDrag with release: false). */
async function pointerMoveTo(x, y, steps = 1) {
	const start = await getCursorPosition();
	const deltaX = x - start.x;
	const deltaY = y - start.y;
	for (let i = 1; i <= steps; i++) {
		const progress = i / steps;
		const cx = start.x + deltaX * progress;
		const cy = start.y + deltaY * progress;
		dispatchPointer(document.documentElement, "pointermove", cx, cy, 1);
		await new Promise((resolve) => setTimeout(resolve, 1));
	}
	updateCursorPosition(x, y);
}
async function pointerRelease(x, y) {
	const pos = x != null && y != null ? {
		x,
		y
	} : await getCursorPosition();
	dispatchPointer(document.documentElement, "pointerup", pos.x, pos.y, 0);
	updateCursorPosition(pos.x, pos.y);
}
async function dragAndDrop(element, delta, options = {}) {
	await pointerDrag(element, delta, {
		...options,
		release: true
	});
}
/**
* Force a real user interaction by focusing and using keyboard
* Last resort method for testing
*/
async function dragUsingKeyboard(element, delta) {
	const domElement = "element" in element && typeof element.element === "function" ? element.element() : element;
	if (!domElement.hasAttribute("tabindex")) domElement.setAttribute("tabindex", "0");
	domElement.focus();
	Math.max(Math.abs(delta.deltaX), Math.abs(delta.deltaY));
	for (let i = 0; i < Math.abs(delta.deltaX); i++) {
		const key = delta.deltaX > 0 ? "ArrowRight" : "ArrowLeft";
		domElement.dispatchEvent(new KeyboardEvent("keydown", {
			key,
			bubbles: true
		}));
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	for (let i = 0; i < Math.abs(delta.deltaY); i++) {
		const key = delta.deltaY > 0 ? "ArrowDown" : "ArrowUp";
		domElement.dispatchEvent(new KeyboardEvent("keydown", {
			key,
			bubbles: true
		}));
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}
/**
* Mouse wheel scroll simulation
* Works across all browsers (Chrome, Firefox, Safari) using Vitest commands
*
* @param options - Scroll options
* @example
* await mouseWheel({ x: 100, y: 200, deltaX: 0, deltaY: -100 }) // Scroll up
* await mouseWheel({ x: 100, y: 200, deltaX: 0, deltaY: 100 })  // Scroll down
*/
async function mouseWheel(options) {
	const { x, y, deltaX, deltaY } = options;
	updateCursorPosition(x, y);
	if (isVitestBrowser$1()) try {
		await null.mouseWheel(deltaX, deltaY);
		return;
	} catch (error) {
		console.warn("Custom mouseWheel command failed, falling back to DOM events:", error);
	}
	const wheelEvent = new WheelEvent("wheel", {
		bubbles: true,
		cancelable: true,
		clientX: x,
		clientY: y,
		deltaX,
		deltaY,
		view: window
	});
	const elementAtPoint = document.elementFromPoint(x, y);
	if (elementAtPoint) elementAtPoint.dispatchEvent(wheelEvent);
	else document.dispatchEvent(wheelEvent);
}
//#endregion
//#region ../testing/src/rng.ts
function createRng(seed) {
	let state = seed >>> 0 || 1;
	const next = () => {
		state = state + 1831565813 >>> 0;
		let t = Math.imul(state ^ state >>> 15, 1 | state);
		t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	};
	return {
		next,
		range(min, max) {
			return min + next() * (max - min);
		},
		gaussian(mean = 0, std = 1) {
			let u = 0;
			let v = 0;
			while (u === 0) u = next();
			while (v === 0) v = next();
			return mean + Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * std;
		},
		sign() {
			return next() < .5 ? -1 : 1;
		},
		int(n) {
			return Math.floor(next() * n);
		}
	};
}
function valueNoise1D(rng, length, scale = 1) {
	const out = [];
	let v = rng.range(-scale, scale);
	for (let i = 0; i < length; i++) {
		v += rng.gaussian(0, scale * .35);
		out.push(v);
	}
	return out;
}
function randomSeed() {
	return (Date.now() ^ Math.random() * 4294967295) >>> 0;
}
//#endregion
//#region ../testing/src/kinematics.ts
function minimumJerk(t) {
	const u = Math.max(0, Math.min(1, t));
	return u * u * u * (10 + u * (-15 + u * 6));
}
function fittsDurationMs(distancePx, targetSizePx) {
	const a = 50;
	const b = 150;
	const id = Math.log2(distancePx / Math.max(4, targetSizePx) + 1);
	return a + b * Math.max(0, id);
}
function tremorOffset(rng, tMs, ampPx, hz = 10) {
	const phase = tMs / 1e3 * hz * Math.PI * 2;
	return {
		x: Math.sin(phase) * ampPx + rng.gaussian(0, ampPx * .15),
		y: Math.cos(phase * 1.07) * ampPx + rng.gaussian(0, ampPx * .15)
	};
}
function lerp(a, b, t) {
	return a + (b - a) * t;
}
function lerpPoint(from, to, t) {
	return {
		x: lerp(from.x, to.x, t),
		y: lerp(from.y, to.y, t)
	};
}
function distance(a, b) {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	return Math.hypot(dx, dy);
}
function sampleMinimumJerkPath(from, to, durationMs, sampleCount, rng, tremorAmp = 0) {
	const samples = [];
	const dt = durationMs / Math.max(1, sampleCount);
	for (let i = 1; i <= sampleCount; i++) {
		let p = lerpPoint(from, to, minimumJerk(i / sampleCount));
		if (tremorAmp > 0) {
			const tr = tremorOffset(rng, i * dt, tremorAmp);
			p = {
				x: p.x + tr.x,
				y: p.y + tr.y
			};
		}
		samples.push({
			x: p.x,
			y: p.y,
			dt
		});
	}
	return samples;
}
function applyJitterToSamples(samples, rng, ampPx) {
	return samples.map((s, i) => ({
		...s,
		x: s.x + rng.gaussian(0, ampPx),
		y: s.y + rng.gaussian(0, ampPx),
		dt: s.dt * rng.range(.85, 1.15)
	}));
}
//#endregion
//#region ../testing/src/paths.ts
function dwell(ms) {
	return (_rng, _ctx) => ({
		name: "dwell",
		build(ctx) {
			return {
				samples: [{
					x: ctx.cursor.x,
					y: ctx.cursor.y,
					dt: ms
				}],
				endCursor: ctx.cursor
			};
		}
	});
}
function moveToHuman(to, opts) {
	return (rng, _ctx) => ({
		name: "moveToHuman",
		build(c) {
			const duration = fittsDurationMs(distance(c.cursor, to), 24);
			const count = opts?.samples ?? Math.max(8, Math.round(duration / 12));
			return {
				samples: sampleMinimumJerkPath(c.cursor, to, duration, count, rng, opts?.tremor ?? .5),
				endCursor: to
			};
		}
	});
}
function lineTo(to, steps = 12) {
	return (_rng, _ctx) => ({
		name: "lineTo",
		build(ctx) {
			const samples = [];
			const dt = 8;
			for (let i = 1; i <= steps; i++) {
				const t = i / steps;
				const p = lerpPoint(ctx.cursor, to, t);
				samples.push({
					x: p.x,
					y: p.y,
					dt
				});
			}
			return {
				samples,
				endCursor: to
			};
		}
	});
}
function curveTo(to, bowPx) {
	return (rng) => ({
		name: "curveTo",
		build(ctx) {
			const mid = {
				x: (ctx.cursor.x + to.x) / 2 + rng.gaussian(0, bowPx),
				y: (ctx.cursor.y + to.y) / 2 + rng.gaussian(0, bowPx)
			};
			const samples = [];
			const steps = 16;
			const dt = 10;
			for (let i = 1; i <= steps; i++) {
				const t = i / steps;
				const u = 1 - t;
				const x = u * u * ctx.cursor.x + 2 * u * t * mid.x + t * t * to.x;
				const y = u * u * ctx.cursor.y + 2 * u * t * mid.y + t * t * to.y;
				samples.push({
					x,
					y,
					dt
				});
			}
			return {
				samples,
				endCursor: to
			};
		}
	});
}
function zigzag(to, opts) {
	return (rng) => ({
		name: "zigzag",
		build(ctx) {
			const amp = opts?.amplitude ?? 12;
			const freq = opts?.freq ?? 6;
			const steps = Math.max(12, Math.round(distance(ctx.cursor, to) / 8));
			const samples = [];
			const perp = {
				x: -(to.y - ctx.cursor.y),
				y: to.x - ctx.cursor.x
			};
			const len = Math.hypot(perp.x, perp.y) || 1;
			perp.x /= len;
			perp.y /= len;
			for (let i = 1; i <= steps; i++) {
				const t = i / steps;
				const base = lerpPoint(ctx.cursor, to, t);
				const wobble = Math.sin(t * Math.PI * freq) * amp * (1 - t * .3);
				samples.push({
					x: base.x + perp.x * wobble + rng.gaussian(0, 1),
					y: base.y + perp.y * wobble + rng.gaussian(0, 1),
					dt: rng.range(6, 14)
				});
			}
			return {
				samples,
				endCursor: to
			};
		}
	});
}
function scribblePath(opts) {
	return (rng) => ({
		name: "scribblePath",
		build(ctx) {
			const radius = opts?.radius ?? 40;
			const revolutions = opts?.revolutions ?? 4;
			const chaos = opts?.chaos ?? 1;
			const durationMs = opts?.durationMs ?? 600;
			const steps = Math.max(24, Math.round(revolutions * 16 / chaos));
			const dt = durationMs / steps;
			const samples = [];
			const cx = ctx.cursor.x;
			const cy = ctx.cursor.y;
			for (let i = 1; i <= steps; i++) {
				const angle = i / steps * Math.PI * 2 * revolutions;
				const r = radius * rng.range(.4, 1.2) * chaos;
				samples.push({
					x: cx + Math.cos(angle) * r + rng.gaussian(0, 3 * chaos),
					y: cy + Math.sin(angle) * r + rng.gaussian(0, 3 * chaos),
					dt: dt * rng.range(.7, 1.3)
				});
			}
			return {
				samples,
				endCursor: {
					x: cx,
					y: cy
				}
			};
		}
	});
}
function overshootTo(to, opts) {
	return (rng) => ({
		name: "overshootTo",
		build(ctx) {
			const dist = distance(ctx.cursor, to);
			const dir = dist > 0 ? {
				x: (to.x - ctx.cursor.x) / dist,
				y: (to.y - ctx.cursor.y) / dist
			} : {
				x: 1,
				y: 0
			};
			const overshoot = opts?.distancePx ?? rng.range(8, 24);
			const past = {
				x: to.x + dir.x * overshoot,
				y: to.y + dir.y * overshoot
			};
			const toPast = sampleMinimumJerkPath(ctx.cursor, past, opts?.settleMs ?? 120, 10, rng, .3);
			const settle = sampleMinimumJerkPath(past, to, 80, 8, rng, .5);
			return {
				samples: [...toPast, ...settle],
				endCursor: to
			};
		}
	});
}
function flick(dir, distancePx) {
	return (rng) => ({
		name: "flick",
		build(ctx) {
			const len = Math.hypot(dir.x, dir.y) || 1;
			const to = {
				x: ctx.cursor.x + dir.x / len * distancePx,
				y: ctx.cursor.y + dir.y / len * distancePx
			};
			return {
				samples: sampleMinimumJerkPath(ctx.cursor, to, 60, 6, rng, 0),
				endCursor: to
			};
		}
	});
}
function jitterSegment(ampPx) {
	return (rng) => ({
		name: "jitter",
		build(ctx) {
			const samples = applyJitterToSamples([{
				x: ctx.cursor.x,
				y: ctx.cursor.y,
				dt: 16
			}], rng, ampPx);
			for (let i = 0; i < 6; i++) samples.push({
				x: ctx.cursor.x + rng.gaussian(0, ampPx),
				y: ctx.cursor.y + rng.gaussian(0, ampPx),
				dt: rng.range(8, 20)
			});
			return {
				samples,
				endCursor: ctx.cursor
			};
		}
	});
}
function buildSegments(seed, start, factories) {
	const rng = createRng(seed);
	let ctx = {
		rng,
		cursor: start
	};
	const all = [];
	const segments = [];
	for (const factory of factories) {
		const segment = factory(rng, ctx);
		const built = segment.build(ctx);
		segments.push({
			name: segment.name,
			startIndex: all.length,
			count: built.samples.length
		});
		all.push(...built.samples);
		ctx = {
			rng,
			cursor: built.endCursor
		};
	}
	return {
		samples: all,
		segments
	};
}
//#endregion
//#region ../testing/src/backend.ts
function isVitestBrowser() {
	return false;
}
function sleep(ms, mode) {
	if (mode === "fast" || ms <= 0) return Promise.resolve();
	return new Promise((r) => setTimeout(r, ms));
}
var SyntheticBackend = class {
	kind = "synthetic";
	#target = null;
	#mode;
	#timestamp = 0;
	constructor(mode = "fast") {
		this.#mode = mode;
	}
	async begin(session) {
		this.#target = session.target;
		this.#timestamp = performance.now();
		const t = session.target;
		dispatchPointer(t, "pointermove", session.startX, session.startY, 0);
		await sleep(1, this.#mode);
		dispatchPointer(t, "pointerdown", session.startX, session.startY, 1);
	}
	async move(samples) {
		const t = this.#target ?? document.documentElement;
		for (const s of samples) {
			this.#timestamp += s.dt;
			dispatchPointer(t, "pointermove", s.x, s.y, 1);
			await sleep(s.dt, this.#mode);
		}
	}
	async end(x, y) {
		const t = this.#target ?? document.documentElement;
		await sleep(1, this.#mode);
		dispatchPointer(t, "pointerup", x, y, 0);
		this.#target = null;
	}
	async cancel() {
		if (!this.#target) return;
		const pos = {
			x: 0,
			y: 0
		};
		dispatchPointer(this.#target, "pointerup", pos.x, pos.y, 0);
		this.#target = null;
	}
};
var PlaywrightBackend = class {
	kind = "playwright";
	#mode;
	constructor(mode = "realtime") {
		this.#mode = mode;
	}
	async begin(session) {
		if (!isVitestBrowser()) throw new Error("PlaywrightBackend requires Vitest browser mode");
		await null.mouseMove(session.startX, session.startY);
		await null.mouseDown(session.startX, session.startY, "left");
	}
	async move(samples) {
		if (!isVitestBrowser()) throw new Error("PlaywrightBackend requires Vitest browser mode");
		for (const s of samples) {
			await null.mouseMove(s.x, s.y, 1);
			await sleep(s.dt, this.#mode);
		}
	}
	async end(x, y) {
		if (!isVitestBrowser()) throw new Error("PlaywrightBackend requires Vitest browser mode");
		await null.mouseUp(x, y, "left");
	}
	async cancel() {
		if (!isVitestBrowser()) return;
		const pos = await null.getMousePosition();
		await null.mouseUp(pos.x, pos.y, "left");
	}
};
function pickBackend(opts = {}) {
	if (opts.trusted && isVitestBrowser()) return new PlaywrightBackend(opts.mode ?? "realtime");
	return new SyntheticBackend(opts.mode ?? "fast");
}
//#endregion
//#region ../testing/src/targets.ts
const RESIZE_HANDLE_ATTR = "data-neodrag-resize-handle";
async function resolveElement(el) {
	if ("element" in el && typeof el.element === "function") return el.element();
	return el;
}
function rectOf(el) {
	return el.getBoundingClientRect();
}
function centerOfRect(rect) {
	return {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2
	};
}
async function centerOf(el) {
	return centerOfRect(rectOf(await resolveElement(el)));
}
async function resolveHandle(root, edge) {
	const handle = (await resolveElement(root)).querySelector(`[${RESIZE_HANDLE_ATTR}="${edge}"]`);
	if (!handle) throw new Error(`Resize handle not found: ${edge}`);
	return {
		handle,
		point: centerOfRect(handle.getBoundingClientRect())
	};
}
async function sortableItems(list) {
	return [...(await resolveElement(list)).querySelectorAll("[data-sortable-key]")];
}
async function keyAt(list, index) {
	return (await sortableItems(list))[index]?.getAttribute("data-sortable-key") ?? null;
}
async function sortableItemAt(list, index) {
	const item = (await sortableItems(list))[index];
	if (!item) throw new Error(`Sortable item at index ${index} not found`);
	return item;
}
function dropZoneRect(zone) {
	return zone.getBoundingClientRect();
}
function edgePoint(rect, side, insetPx = 4, outside = false) {
	const sign = outside ? -1 : 1;
	switch (side) {
		case "top": return {
			x: rect.left + rect.width / 2,
			y: rect.top + sign * insetPx
		};
		case "bottom": return {
			x: rect.left + rect.width / 2,
			y: rect.bottom - sign * insetPx
		};
		case "left": return {
			x: rect.left + sign * insetPx,
			y: rect.top + rect.height / 2
		};
		case "right": return {
			x: rect.right - sign * insetPx,
			y: rect.top + rect.height / 2
		};
	}
}
async function midpointBetween(a, b) {
	const ra = rectOf(await resolveElement(a));
	const rb = rectOf(await resolveElement(b));
	return {
		x: (ra.left + ra.right + rb.left + rb.right) / 4,
		y: (ra.top + rb.bottom) / 2
	};
}
async function indexOfSortableItem(item, list) {
	const key = (await resolveElement(item)).getAttribute("data-sortable-key");
	return (await sortableItems(list)).findIndex((n) => n.getAttribute("data-sortable-key") === key);
}
async function keysFromList(list) {
	return (await sortableItems(list)).map((n) => n.getAttribute("data-sortable-key")).filter(Boolean);
}
//#endregion
//#region ../testing/src/gesture.ts
function compose(grabTarget, factories, opts = {}) {
	const seed = opts.seed ?? randomSeed();
	const target = opts.target ?? grabTarget;
	const start = opts.start;
	const built = buildSegments(seed, start ?? {
		x: 0,
		y: 0
	}, factories);
	return {
		seed,
		start: start ?? {
			x: 0,
			y: 0
		},
		samples: built.samples,
		segments: built.segments,
		target,
		grabTarget
	};
}
async function play(gesture, opts = {}) {
	const backend = opts.backend ?? pickBackend({
		trusted: opts.trusted,
		mode: opts.mode
	});
	const start = gesture.start;
	await backend.begin({
		target: gesture.grabTarget,
		startX: start.x,
		startY: start.y
	});
	await backend.move(gesture.samples);
	const last = gesture.samples.at(-1);
	const end = last ? {
		x: last.x,
		y: last.y
	} : start;
	await backend.end(end.x, end.y);
	return end;
}
async function composeAndPlay(grabTarget, factories, opts = {}) {
	const start = opts.start ?? await centerOf(grabTarget);
	const gesture = compose(grabTarget, factories, {
		...opts,
		start,
		grabTarget
	});
	return {
		gesture,
		end: await play(gesture, opts)
	};
}
function humanDrag(el) {
	let seed = randomSeed();
	let mode = "fast";
	let trusted = false;
	let factories = [];
	let grabEl = null;
	const builder = {
		seed(s) {
			seed = s;
			return builder;
		},
		mode(m) {
			mode = m;
			return builder;
		},
		trusted(v = true) {
			trusted = v;
			return builder;
		},
		segments(...f) {
			factories = f;
			return builder;
		},
		async run() {
			grabEl = await resolveElement(el);
			const start = await centerOf(grabEl);
			return composeAndPlay(grabEl, factories, {
				seed,
				start,
				mode,
				trusted,
				grabTarget: grabEl
			});
		}
	};
	return builder;
}
//#endregion
//#region ../testing/src/commands.ts
function intensityScale(intensity = "normal") {
	switch (intensity) {
		case "tame": return {
			tremor: .2,
			zigzag: 4,
			overshoot: 6,
			scribble: .5
		};
		case "wild": return {
			tremor: 1.2,
			zigzag: 18,
			overshoot: 28,
			scribble: 1.4
		};
		case "chaotic": return {
			tremor: 2.5,
			zigzag: 32,
			overshoot: 48,
			scribble: 2.2
		};
		default: return {
			tremor: .6,
			zigzag: 10,
			overshoot: 16,
			scribble: 1
		};
	}
}
async function wildDrag(el, target, opts = {}) {
	const scale = intensityScale(opts.intensity);
	const from = await centerOf(el);
	const to = await centerOf(target);
	const { end } = await composeAndPlay(await resolveElement(el), [
		moveToHuman(to, { tremor: scale.tremor }),
		zigzag(to, { amplitude: scale.zigzag }),
		overshootTo(to, { distancePx: scale.overshoot }),
		jitterSegment(scale.tremor)
	], {
		seed: opts.seed,
		start: from,
		mode: opts.mode,
		trusted: opts.trusted
	});
	return end;
}
async function humanDragAndDrop(el, target, opts = {}) {
	const scale = intensityScale(opts.intensity ?? "tame");
	const from = await centerOf(el);
	const to = await centerOf(target);
	const { end } = await composeAndPlay(await resolveElement(el), [moveToHuman(to, { tremor: scale.tremor }), overshootTo(to, { distancePx: scale.overshoot * .5 })], {
		seed: opts.seed,
		start: from,
		mode: opts.mode,
		trusted: opts.trusted
	});
	return end;
}
async function scribbleInPlace(el, opts = {}) {
	const scale = intensityScale(opts.intensity ?? "wild");
	const from = await centerOf(el);
	const { end } = await composeAndPlay(await resolveElement(el), [scribblePath({
		radius: opts.radius ?? 40,
		durationMs: opts.durationMs ?? 600,
		chaos: scale.scribble,
		revolutions: opts.intensity === "chaotic" ? 6 : 4
	})], {
		seed: opts.seed,
		start: from,
		mode: opts.mode ?? "realtime",
		trusted: opts.trusted
	});
	return end;
}
async function fuzzDrag(el, opts = {}) {
	const seed = opts.seed ?? randomSeed();
	const rng = createRng(seed);
	const from = await centerOf(el);
	const grab = await resolveElement(el);
	const area = opts.area ?? {
		width: 200,
		height: 200
	};
	const to = {
		x: from.x + rng.range(-area.width / 2, area.width / 2),
		y: from.y + rng.range(-area.height / 2, area.height / 2)
	};
	const scale = intensityScale(opts.intensity ?? "chaotic");
	const { end } = await composeAndPlay(grab, [
		curveTo(to, scale.zigzag),
		zigzag(to, { amplitude: scale.zigzag }),
		scribblePath({
			radius: 20,
			durationMs: 200,
			chaos: scale.scribble * .5
		}),
		moveToHuman(to, { tremor: scale.tremor })
	], {
		seed,
		start: from,
		mode: opts.mode,
		trusted: opts.trusted
	});
	return end;
}
async function dropOnto(el, zone, opts = {}) {
	return humanDragAndDrop(el, zone, opts);
}
async function wildDropApproach(el, zone, opts = {}) {
	const scale = intensityScale(opts.intensity ?? "wild");
	const grab = await resolveElement(el);
	const rect = (await resolveElement(zone)).getBoundingClientRect();
	const from = await centerOf(grab);
	const inside = {
		x: rect.left + rect.width / 2,
		y: rect.top + rect.height / 2
	};
	const outside = edgePoint(rect, "top", 20, true);
	const passes = opts.passes ?? 3;
	const factories = [];
	for (let i = 0; i < passes; i++) {
		factories.push(moveToHuman(outside, { tremor: scale.tremor }));
		factories.push(zigzag(inside, { amplitude: scale.zigzag }));
		factories.push(overshootTo(inside, { distancePx: scale.overshoot }));
	}
	factories.push(dwell(30));
	const { end } = await composeAndPlay(grab, factories, {
		seed: opts.seed,
		start: from,
		mode: opts.mode,
		trusted: opts.trusted
	});
	return end;
}
async function hoverChurn(el, zone, opts = {}) {
	await wildDropApproach(el, zone, {
		...opts,
		passes: opts.passes ?? 6
	});
}
async function dropOnOverlap(el, zones, opts = {}) {
	const resolved = await Promise.all(zones.map((z) => resolveElement(z)));
	let seam = null;
	if (resolved.length >= 2) {
		const a = resolved[0].getBoundingClientRect();
		const b = resolved[1].getBoundingClientRect();
		seam = {
			x: (a.right + b.left) / 2,
			y: (a.top + a.bottom + b.top + b.bottom) / 4
		};
	}
	const target = seam ?? await centerOf(resolved[0]);
	const grab = await resolveElement(el);
	const from = await centerOf(grab);
	const scale = intensityScale(opts.intensity);
	const { end } = await composeAndPlay(grab, [curveTo(target, scale.zigzag), overshootTo(target, { distancePx: scale.overshoot })], {
		seed: opts.seed,
		start: from,
		mode: opts.mode,
		trusted: opts.trusted
	});
	return end;
}
async function sortableReorder(item, toIndex, list, opts = {}) {
	return humanDragAndDrop(item, await sortableItemAt(list, toIndex), {
		...opts,
		intensity: opts.intensity ?? "tame"
	});
}
async function wildReorder(item, toIndex, list, opts = {}) {
	const scale = intensityScale(opts.intensity ?? "wild");
	const grab = await resolveElement(item);
	const from = await centerOf(grab);
	const fromIndex = await indexOfSortableItem(item, list);
	const items = await sortableItems(list);
	const target = await centerOf(await sortableItemAt(list, toIndex));
	const factories = [];
	if (fromIndex === toIndex) factories.push(moveToHuman(target, { tremor: scale.tremor }));
	else {
		const step = fromIndex < toIndex ? 1 : -1;
		for (let i = fromIndex; i !== toIndex; i += step) {
			const next = i + step;
			if (next < 0 || next >= items.length) break;
			const mid = await midpointBetween(items[i], items[next]);
			factories.push(zigzag(mid, { amplitude: scale.zigzag }));
			factories.push(moveToHuman(mid, { tremor: scale.tremor }));
			factories.push(jitterSegment(scale.tremor));
		}
		factories.push(overshootTo(target, { distancePx: scale.overshoot }));
	}
	const { end } = await composeAndPlay(grab, factories, {
		seed: opts.seed,
		start: from,
		mode: opts.mode,
		trusted: opts.trusted
	});
	return end;
}
async function midpointThrash(item, neighbor, opts = {}) {
	const scale = intensityScale(opts.intensity ?? "chaotic");
	const grab = await resolveElement(item);
	const from = await centerOf(grab);
	const mid = await midpointBetween(item, neighbor);
	const passes = opts.passes ?? 8;
	const factories = [];
	for (let i = 0; i < passes; i++) {
		const offset = scale.zigzag * (i % 2 === 0 ? 1 : -1);
		factories.push(zigzag({
			x: mid.x + offset,
			y: mid.y
		}, { amplitude: scale.zigzag }));
		factories.push(jitterSegment(scale.tremor));
	}
	await composeAndPlay(grab, factories, {
		seed: opts.seed,
		start: from,
		mode: opts.mode ?? "realtime",
		trusted: opts.trusted
	});
}
async function crossListTransfer(item, fromList, toList, toIndex, opts = {}) {
	const targetItem = await sortableItemAt(toList, toIndex);
	const scale = intensityScale(opts.intensity ?? "normal");
	const grab = await resolveElement(item);
	const from = await centerOf(grab);
	const to = await centerOf(targetItem);
	const listRect = (await resolveElement(toList)).getBoundingClientRect();
	const { end } = await composeAndPlay(grab, [
		moveToHuman({
			x: listRect.left + listRect.width / 2,
			y: listRect.top + 20
		}, { tremor: scale.tremor }),
		curveTo(to, scale.zigzag),
		zigzag(to, { amplitude: scale.zigzag }),
		overshootTo(to, { distancePx: scale.overshoot })
	], {
		seed: opts.seed,
		start: from,
		mode: opts.mode,
		trusted: opts.trusted
	});
	return end;
}
async function resizeHandle(el, edge, delta, opts = {}) {
	const { handle, point } = await resolveHandle(el, edge);
	const to = {
		x: point.x + delta.deltaX,
		y: point.y + delta.deltaY
	};
	opts.intensity;
	const { end } = await composeAndPlay(handle, [lineTo(to, 10)], {
		seed: opts.seed,
		start: point,
		mode: opts.mode,
		trusted: opts.trusted
	});
	return end;
}
async function wildResize(el, edge, opts = {}) {
	const { handle, point } = await resolveHandle(el, edge);
	const scale = intensityScale(opts.intensity ?? "wild");
	const rng = createRng(opts.seed ?? randomSeed());
	const dist = opts.overshoot ?? rng.range(40, 120);
	const dir = {
		x: 0,
		y: 0
	};
	if (edge.includes("e")) dir.x = dist;
	if (edge.includes("w")) dir.x = -dist;
	if (edge.includes("s")) dir.y = dist;
	if (edge.includes("n")) dir.y = -dist;
	const to = {
		x: point.x + dir.x,
		y: point.y + dir.y
	};
	const { end } = await composeAndPlay(handle, [
		moveToHuman(to, { tremor: scale.tremor }),
		...opts.zigzag !== false ? [zigzag(to, { amplitude: scale.zigzag })] : [],
		overshootTo(to, { distancePx: opts.overshoot ?? scale.overshoot })
	], {
		seed: opts.seed,
		start: point,
		mode: opts.mode,
		trusted: opts.trusted
	});
	return end;
}
async function resizeBeyondBounds(el, edge, opts = {}) {
	const past = opts.past ?? 200;
	return wildResize(el, edge, {
		...opts,
		overshoot: past,
		intensity: opts.intensity ?? "chaotic"
	});
}
async function resizeCornerChaos(el, corner, opts = {}) {
	const { handle, point } = await resolveHandle(el, corner);
	const scale = intensityScale(opts.intensity ?? "chaotic");
	const r = createRng(opts.seed ?? randomSeed()).range(30, 80);
	const to = {
		x: point.x + r,
		y: point.y + r
	};
	const { end } = await composeAndPlay(handle, [
		scribblePath({
			radius: r * .5,
			durationMs: 400,
			chaos: scale.scribble
		}),
		zigzag(to, { amplitude: scale.zigzag }),
		overshootTo(to, { distancePx: scale.overshoot })
	], {
		seed: opts.seed,
		start: point,
		mode: opts.mode ?? "realtime",
		trusted: opts.trusted
	});
	return end;
}
//#endregion
//#region ../testing/src/fuzz.ts
function parseTranslatePx(tr) {
	const m1 = tr.match(/translate\(\s*([-\d.]+)px\s*,\s*([-\d.]+)px\s*\)/);
	if (m1) return {
		x: parseFloat(m1[1]),
		y: parseFloat(m1[2])
	};
	const m2 = tr.match(/translate:\s*([-\d.]+)px\s+([-\d.]+)px/);
	if (m2) return {
		x: parseFloat(m2[1]),
		y: parseFloat(m2[2])
	};
	return null;
}
async function assertDragInvariants(ctx) {
	const style = getComputedStyle(ctx.element);
	const tr = style.translate || style.transform || "none";
	if (tr.includes("NaN") || tr.includes("Infinity")) throw new Error(`Invalid transform: ${tr}`);
	const parsed = parseTranslatePx(tr);
	if (parsed && (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y))) throw new Error(`Non-finite translate: ${parsed.x}, ${parsed.y}`);
}
async function assertSortableInvariants(ctx) {
	const keysAfter = [...ctx.list.querySelectorAll("[data-sortable-key]")].map((n) => n.getAttribute("data-sortable-key"));
	if (keysAfter.length !== ctx.keysBefore.length) throw new Error(`Sortable length changed: ${ctx.keysBefore.length} -> ${keysAfter.length}`);
	const before = [...ctx.keysBefore].sort().join(",");
	const after = [...keysAfter.filter(Boolean)].sort().join(",");
	if (before !== after) throw new Error(`Sortable keys not a permutation: before=[${before}] after=[${after}]`);
}
async function assertResizeInvariants(el) {
	const w = parseFloat(getComputedStyle(el).width);
	const h = parseFloat(getComputedStyle(el).height);
	if (!Number.isFinite(w) || !Number.isFinite(h) || w < 0 || h < 0) throw new Error(`Invalid resize dimensions: ${w}x${h}`);
}
function resolveSeeds(opts) {
	if (opts.seeds?.length) return opts.seeds;
	const count = opts.count ?? 10;
	const base = randomSeed();
	const out = [];
	const rng = createRng(base);
	for (let i = 0; i < count; i++) out.push(rng.int(4294967295));
	return out;
}
async function fuzz(opts) {
	const seeds = resolveSeeds(opts);
	const failures = [];
	for (let runIndex = 0; runIndex < seeds.length; runIndex++) {
		const seed = seeds[runIndex];
		const rng = createRng(seed);
		try {
			await opts.onBefore?.();
			await opts.gesture({
				seed,
				rng,
				runIndex
			});
			await opts.onAfter?.();
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			failures.push({
				seed,
				runIndex,
				message
			});
			console.error(`[neodrag/fuzz] FAILED seed=${seed} run=${runIndex}: ${message}`);
			console.error(`[neodrag/fuzz] Replay with: seed ${seed}`);
		}
	}
	return {
		runs: seeds.length,
		failures
	};
}
function createSortableFuzzGesture(item, list, gesture) {
	return async (ctx) => {
		const listEl = await resolveElement(list);
		const itemEl = await resolveElement(item);
		const keysBefore = await keysFromList(list);
		await gesture(itemEl, listEl, ctx);
		await assertSortableInvariants({
			list: listEl,
			keysBefore
		});
	};
}
function createDragFuzzGesture(item, gesture) {
	return async (ctx) => {
		const itemEl = await resolveElement(item);
		await gesture(itemEl, ctx);
		await assertDragInvariants({ element: itemEl });
	};
}
//#endregion
export { PlaywrightBackend, RESIZE_HANDLE_ATTR, SyntheticBackend, applyJitterToSamples, assertDragInvariants, assertResizeInvariants, assertSortableInvariants, buildSegments, centerOf, centerOfRect, clickElement, compose, composeAndPlay, createDragFuzzGesture, createRng, createSortableFuzzGesture, crossListTransfer, curveTo, dispatchPointer, distance, dragAndDrop, dragUsingKeyboard, dropOnOverlap, dropOnto, dropZoneRect, dwell, edgePoint, fittsDurationMs, flick, fuzz, fuzzDrag, getCursorPosition, getCursorPositionRelativeToElement, getElementCoords, hoverChurn, humanDrag, humanDragAndDrop, indexOfSortableItem, isCursorOverElement, jitterSegment, keyAt, keysFromList, lerp, lerpPoint, lineTo, midpointBetween, midpointThrash, minimumJerk, mouseClick, mouseDoubleClick, mouseDown, mouseMove, mouseUp, mouseWheel, moveToHuman, overshootTo, pickBackend, play, pointerDrag, pointerMoveTo, pointerRelease, randomSeed, rectOf, resizeBeyondBounds, resizeCornerChaos, resizeHandle, resolveElement, resolveHandle, sampleMinimumJerkPath, scribbleInPlace, scribblePath, sortableItemAt, sortableItems, sortableReorder, startCursorTracking, stopCursorTracking, tremorOffset, valueNoise1D, wildDrag, wildDropApproach, wildReorder, wildResize, zigzag };
