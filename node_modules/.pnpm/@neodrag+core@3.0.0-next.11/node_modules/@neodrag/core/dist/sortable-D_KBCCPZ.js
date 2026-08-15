import { t as sharedCapability } from "./shared-5VBBgXhD.js";
import { i as Sortable, k as sortableKey, n as SORTABLE_KEY_ATTR } from "./sortable--ZstZ5oN.js";
//#region src/sortable/sortable-list.ts
/** Ergonomic per-container class: `new SortableList(container, options)`. Satisfies the unified
*  {@link CollabTarget} seam, so `room.add(list)` works. */
var SortableList = class {
	#handle;
	constructor(container, options) {
		this.#handle = sharedCapability(Sortable, () => new Sortable()).bind(container, options);
	}
	/**
	* The per-row binding — spread it onto each item element instead of hand-writing the
	* `data-neodrag-sortable-key` attribute: `<li {...list.row(item)}>`. Pass the ITEM; its key is derived
	* via {@link sortableKey} (its `id`/`key`, or the item itself for primitives).
	*/
	row(item) {
		return { [SORTABLE_KEY_ATTR]: sortableKey(item) };
	}
	/**
	* Imperatively register a row element under a stable string key — stamps the sortable-key
	* attribute and returns a teardown that removes it. For framework wrappers whose row binding is
	* an attachment/directive (`{...list.row(id)}`) rather than a static attribute.
	*/
	registerRow(node, key) {
		node.setAttribute(SORTABLE_KEY_ATTR, key);
		return () => node.removeAttribute(SORTABLE_KEY_ATTR);
	}
	update(options) {
		this.#handle.update(options);
	}
	/** Current in-flight reorder presence (drag key + from/to index), or null. */
	presence() {
		return this.#handle.presence();
	}
	get targetId() {
		return this.#handle.targetId;
	}
	get hasExplicitId() {
		return this.#handle.hasExplicitId;
	}
	/** Current key order — the Room seeds its reconciler from this. */
	keys() {
		return this.#handle.keys();
	}
	onCommit(fn) {
		return this.#handle.onCommit(fn);
	}
	onPresence(fn) {
		return this.#handle.onPresence(fn);
	}
	/** Apply a remote reorder/transfer fact through the same reorder path a local commit uses. */
	applyExternal(op) {
		this.#handle.applyExternal(op);
	}
	showRemotePresence(frame, opts) {
		this.#handle.showRemotePresence(frame, opts);
	}
	clearRemotePresence(peer_id, opts) {
		this.#handle.clearRemotePresence(peer_id, opts);
	}
	destroy() {
		this.#handle.destroy();
	}
};
//#endregion
export { SortableList as t };
