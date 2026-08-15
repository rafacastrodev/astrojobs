import { createStyles } from "../styles/use-styles.js";
import { insert, mergeProps, spread, template } from "solid-js/web";
import { createMemo } from "solid-js";
import clsx from "clsx";
//#region src/components/button.tsx
var _tmpl$ = /* @__PURE__ */ template(`<button data-tsd-control>`);
function Button(props) {
	const styles = createStyles();
	const classes = createMemo(() => {
		const variant = props.variant || "primary";
		return clsx(styles().button.base, styles().button.variant(variant, props.outline, props.ghost), props.className);
	});
	return (() => {
		var _el$ = _tmpl$();
		spread(_el$, mergeProps(props, { get ["class"]() {
			return classes();
		} }), false, true);
		insert(_el$, () => props.children);
		return _el$;
	})();
}
//#endregion
export { Button };

//# sourceMappingURL=button.js.map