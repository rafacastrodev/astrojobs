import { createStyles } from "../styles/use-styles.js";
import { insert, mergeProps, spread, template } from "solid-js/web";
import clsx from "clsx";
//#region src/components/section.tsx
var _tmpl$ = /* @__PURE__ */ template(`<section data-tsd-surface>`), _tmpl$2 = /* @__PURE__ */ template(`<h3 data-tsd-separator>`), _tmpl$3 = /* @__PURE__ */ template(`<p>`), _tmpl$4 = /* @__PURE__ */ template(`<span>`);
var Section = ({ children, ...rest }) => {
	const styles = createStyles();
	return (() => {
		var _el$ = _tmpl$();
		spread(_el$, mergeProps({ get ["class"]() {
			return clsx(styles().section.main, rest.class);
		} }, rest), false, true);
		insert(_el$, children);
		return _el$;
	})();
};
var SectionTitle = ({ children, ...rest }) => {
	const styles = createStyles();
	return (() => {
		var _el$2 = _tmpl$2();
		spread(_el$2, mergeProps({ get ["class"]() {
			return clsx(styles().section.title, rest.class);
		} }, rest), false, true);
		insert(_el$2, children);
		return _el$2;
	})();
};
var SectionDescription = ({ children, ...rest }) => {
	const styles = createStyles();
	return (() => {
		var _el$3 = _tmpl$3();
		spread(_el$3, mergeProps({ get ["class"]() {
			return clsx(styles().section.description, rest.class);
		} }, rest), false, true);
		insert(_el$3, children);
		return _el$3;
	})();
};
var SectionIcon = ({ children, ...rest }) => {
	const styles = createStyles();
	return (() => {
		var _el$4 = _tmpl$4();
		spread(_el$4, mergeProps({ get ["class"]() {
			return clsx(styles().section.icon, rest.class);
		} }, rest), false, true);
		insert(_el$4, children);
		return _el$4;
	})();
};
//#endregion
export { Section, SectionDescription, SectionIcon, SectionTitle };

//# sourceMappingURL=section.js.map