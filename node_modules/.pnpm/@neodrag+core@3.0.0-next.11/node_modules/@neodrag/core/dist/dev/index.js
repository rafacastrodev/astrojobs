//#region src/dev/inspector.ts
function createInteractionInspector(engine, options = {}) {
	if (!globalThis.document) return {
		refresh() {},
		destroy() {}
	};
	const mount = options.mount ?? document.body;
	const panel = document.createElement("div");
	panel.setAttribute("data-neodrag-inspector", "");
	Object.assign(panel.style, {
		position: "fixed",
		right: "12px",
		bottom: "12px",
		zIndex: "2147483646",
		maxWidth: "320px",
		padding: "10px 12px",
		font: "11px/1.4 ui-monospace, monospace",
		color: "#e8e8e8",
		background: "rgba(12, 14, 20, 0.92)",
		border: "1px solid rgba(255,255,255,0.12)",
		borderRadius: "8px",
		boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
		pointerEvents: "none",
		whiteSpace: "pre-wrap"
	});
	const title = options.title ?? "neodrag";
	let raf_id = 0;
	const render = () => {
		const session = engine.session;
		panel.textContent = [title, session ? `session: ${session.started ? "active" : "pending"} · capability:${String(session.capability.key.description ?? "unknown")}` : "session: idle"].join("\n");
	};
	const loop = () => {
		render();
		raf_id = requestAnimationFrame(loop);
	};
	raf_id = requestAnimationFrame(loop);
	mount.appendChild(panel);
	return {
		refresh() {
			render();
		},
		destroy() {
			if (raf_id) cancelAnimationFrame(raf_id);
			panel.remove();
		}
	};
}
function installInteractionInspector(engine, options) {
	return createInteractionInspector(engine, options);
}
//#endregion
export { createInteractionInspector, installInteractionInspector };
