import { useEffect, useMemo, useRef, useState } from "react";
import { TanStackDevtoolsCore } from "@tanstack/devtools";
import { createPortal } from "react-dom";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/devtools.tsx
var convertRender = (Component, setComponents, e, props) => {
	const element = typeof Component === "function" ? Component(e, props) : Component;
	setComponents((prev) => ({
		...prev,
		[e.getAttribute("id")]: element
	}));
};
var convertTrigger = (Component, setComponent, e, props) => {
	setComponent(typeof Component === "function" ? Component(e, props) : Component);
};
var TanStackDevtools = ({ plugins, config, eventBusConfig }) => {
	const devToolRef = useRef(null);
	const [pluginContainers, setPluginContainers] = useState({});
	const [titleContainers, setTitleContainers] = useState({});
	const [triggerContainer, setTriggerContainer] = useState(null);
	const [PluginComponents, setPluginComponents] = useState({});
	const [TitleComponents, setTitleComponents] = useState({});
	const [TriggerComponent, setTriggerComponent] = useState(null);
	const pluginsMap = useMemo(() => plugins?.map((plugin) => {
		return {
			...plugin,
			name: typeof plugin.name === "string" ? plugin.name : (e, props) => {
				const id = e.getAttribute("id");
				if (e.ownerDocument.getElementById(id)) setTitleContainers((prev) => ({
					...prev,
					[id]: e
				}));
				convertRender(plugin.name, setTitleComponents, e, props);
			},
			render: (e, theme) => {
				const id = e.getAttribute("id");
				if (e.ownerDocument.getElementById(id)) setPluginContainers((prev) => ({
					...prev,
					[id]: e
				}));
				convertRender(plugin.render, setPluginComponents, e, theme);
			}
		};
	}) ?? [], [plugins]);
	const [devtools] = useState(() => {
		const { customTrigger, ...coreConfig } = config || {};
		return new TanStackDevtoolsCore({
			config: {
				...coreConfig,
				customTrigger: customTrigger ? (el, props) => {
					setTriggerContainer(el);
					convertTrigger(customTrigger, setTriggerComponent, el, props);
				} : void 0
			},
			eventBusConfig,
			plugins: pluginsMap
		});
	});
	useEffect(() => {
		devtools.setConfig({ plugins: pluginsMap });
	}, [devtools, pluginsMap]);
	useEffect(() => {
		if (devToolRef.current) devtools.mount(devToolRef.current);
		return () => devtools.unmount();
	}, [devtools]);
	const hasPlugins = Object.values(pluginContainers).length > 0 && Object.values(PluginComponents).length > 0;
	const hasTitles = Object.values(titleContainers).length > 0 && Object.values(TitleComponents).length > 0;
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("div", {
			style: { position: "absolute" },
			ref: devToolRef
		}),
		hasPlugins ? Object.entries(pluginContainers).map(([key, pluginContainer]) => createPortal(/* @__PURE__ */ jsx(Fragment, { children: PluginComponents[key] }), pluginContainer)) : null,
		hasTitles ? Object.entries(titleContainers).map(([key, titleContainer]) => createPortal(/* @__PURE__ */ jsx(Fragment, { children: TitleComponents[key] }), titleContainer)) : null,
		triggerContainer && TriggerComponent ? createPortal(/* @__PURE__ */ jsx(Fragment, { children: TriggerComponent }), triggerContainer) : null
	] });
};
//#endregion
export { TanStackDevtools };

//# sourceMappingURL=devtools.js.map