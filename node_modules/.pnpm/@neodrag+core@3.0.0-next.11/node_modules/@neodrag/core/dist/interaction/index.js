//#region src/interaction-input.ts
const KEYBOARD_POINTER_ID = -1;
const NATIVE_POINTER_ID = -2;
function modifiersFrom(shift, ctrl, alt, meta) {
	return {
		shift,
		ctrl,
		alt,
		meta
	};
}
function modifiersFromPointer(e) {
	return modifiersFrom(e.shiftKey, e.ctrlKey, e.altKey, e.metaKey);
}
function modifiersFromKeyboard(e) {
	return modifiersFrom(e.shiftKey, e.ctrlKey, e.altKey, e.metaKey);
}
function pointerToInput(native, phase, delta) {
	return {
		kind: "pointer",
		phase,
		clientX: native.clientX,
		clientY: native.clientY,
		target: native.target,
		modifiers: modifiersFromPointer(native),
		timestamp: native.timeStamp,
		delta,
		native,
		pointer: {
			pointerId: native.pointerId,
			pointerType: native.pointerType,
			button: native.button,
			buttons: native.buttons,
			pressure: native.pressure
		}
	};
}
function keyboardToInput(opts) {
	const native = opts.native ?? null;
	const modifiers = opts.modifiers ? {
		shift: opts.modifiers.shift ?? false,
		ctrl: opts.modifiers.ctrl ?? false,
		alt: opts.modifiers.alt ?? false,
		meta: opts.modifiers.meta ?? false
	} : native ? modifiersFromKeyboard(native) : modifiersFrom(false, false, false, false);
	return {
		kind: "keyboard",
		phase: opts.phase,
		clientX: opts.clientX,
		clientY: opts.clientY,
		target: opts.target ?? native?.target ?? null,
		modifiers,
		timestamp: opts.timestamp ?? native?.timeStamp ?? performance.now(),
		delta: opts.delta,
		native,
		keyboard: {
			key: opts.key,
			code: opts.code ?? native?.code ?? opts.key,
			repeat: opts.repeat ?? native?.repeat ?? false
		},
		pointerId: opts.pointerId ?? -1
	};
}
function programmaticToInput(opts) {
	return {
		kind: "programmatic",
		phase: opts.phase,
		clientX: opts.clientX,
		clientY: opts.clientY,
		target: opts.target ?? null,
		modifiers: modifiersFrom(false, false, false, false),
		timestamp: opts.timestamp ?? performance.now(),
		delta: opts.delta,
		pointerId: opts.pointerId ?? -1,
		source: opts.source
	};
}
function nativeDragToInput(native, phase) {
	return {
		kind: "native-dnd",
		phase,
		clientX: native.clientX,
		clientY: native.clientY,
		target: native.target,
		modifiers: modifiersFrom(native.shiftKey, native.ctrlKey, native.altKey, native.metaKey),
		timestamp: native.timeStamp,
		native,
		dataTransfer: native.dataTransfer,
		pointerId: -2
	};
}
/** The OS-drop payload — readable only on `drop` (the spec hides file/text content during hover). */
function nativeDropFiles(dt) {
	return dt ? Array.from(dt.files) : [];
}
function nativeDropText(dt) {
	if (!dt) return "";
	return dt.getData("text/plain") || dt.getData("text/uri-list") || dt.getData("text") || "";
}
function isNativeDndInput(i) {
	return i.kind === "native-dnd";
}
function isPointerInput(i) {
	return i.kind === "pointer";
}
function isKeyboardInput(i) {
	return i.kind === "keyboard";
}
function isProgrammaticInput(i) {
	return i.kind === "programmatic";
}
function nativePointerEvent(i) {
	if (!i || i.kind !== "pointer") return null;
	return i.native;
}
function interactionPointerId(i) {
	if (i.kind === "pointer") return i.pointer.pointerId;
	return i.pointerId;
}
function submitInteraction(host, input) {
	if (input.phase === "start") host.onInteractionStart(input);
	else if (input.phase === "move") host.onInteractionMove(input);
	else host.onInteractionEnd(input);
}
//#endregion
export { KEYBOARD_POINTER_ID, NATIVE_POINTER_ID, interactionPointerId, isKeyboardInput, isNativeDndInput, isPointerInput, isProgrammaticInput, keyboardToInput, modifiersFromKeyboard, modifiersFromPointer, nativeDragToInput, nativeDropFiles, nativeDropText, nativePointerEvent, pointerToInput, programmaticToInput, submitInteraction };
