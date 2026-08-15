import { ensureDevtoolsStyles } from "../styles/semantic-theme.js";
import { createComponent, insert, template, use } from "solid-js/web";
import { createContext, createEffect, createSignal, useContext } from "solid-js";
//#region src/components/theme.tsx
var _tmpl$ = /* @__PURE__ */ template(`<span style=display:contents>`);
var ThemeContext = createContext(void 0);
var ThemeContextProvider = (props) => {
	const [theme, setTheme] = createSignal(props.theme);
	createEffect(() => {
		setTheme(props.theme);
	});
	const [container, setContainer] = createSignal();
	createEffect(() => {
		const element = container();
		if (element) ensureDevtoolsStyles(element.ownerDocument);
	});
	return createComponent(ThemeContext.Provider, {
		value: {
			theme,
			setTheme
		},
		get children() {
			var _el$ = _tmpl$();
			use(setContainer, _el$);
			insert(_el$, () => props.children);
			return _el$;
		}
	});
};
function createTheme() {
	const context = useContext(ThemeContext);
	if (!context) throw new Error("createTheme must be used within a ThemeContextProvider");
	return context;
}
//#endregion
export { ThemeContextProvider, createTheme };

//# sourceMappingURL=theme.js.map