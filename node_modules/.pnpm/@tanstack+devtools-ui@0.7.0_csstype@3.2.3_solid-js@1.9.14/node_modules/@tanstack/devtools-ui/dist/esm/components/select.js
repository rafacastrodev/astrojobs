import { createStyles } from "../styles/use-styles.js";
import { className, effect, insert, memo, setAttribute, template } from "solid-js/web";
import { createEffect, createSignal, createUniqueId } from "solid-js";
//#region src/components/select.tsx
var _tmpl$ = /* @__PURE__ */ template(`<div><div><select data-tsd-control>`), _tmpl$2 = /* @__PURE__ */ template(`<label>`), _tmpl$3 = /* @__PURE__ */ template(`<p>`), _tmpl$4 = /* @__PURE__ */ template(`<option>`);
function Select(props) {
	const styles = createStyles();
	const [selected, setSelected] = createSignal(props.value ?? props.options[0]?.value);
	const id = createUniqueId();
	const descriptionId = `${id}-description`;
	createEffect(() => {
		if (props.value !== void 0) setSelected(() => props.value);
	});
	const handleChange = (e) => {
		const value = e.target.value;
		const option = props.options.find((candidate) => String(candidate.value) === value);
		if (!option) return;
		setSelected(() => option.value);
		props.onChange?.(option.value);
	};
	return (() => {
		var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild;
		insert(_el$2, (() => {
			var _c$ = memo(() => !!props.label);
			return () => _c$() && (() => {
				var _el$4 = _tmpl$2();
				setAttribute(_el$4, "for", id);
				insert(_el$4, () => props.label);
				effect(() => className(_el$4, styles().selectLabel));
				return _el$4;
			})();
		})(), _el$3);
		insert(_el$2, (() => {
			var _c$2 = memo(() => !!props.description);
			return () => _c$2() && (() => {
				var _el$5 = _tmpl$3();
				setAttribute(_el$5, "id", descriptionId);
				insert(_el$5, () => props.description);
				effect(() => className(_el$5, styles().selectDescription));
				return _el$5;
			})();
		})(), _el$3);
		_el$3.addEventListener("change", handleChange);
		setAttribute(_el$3, "id", id);
		insert(_el$3, () => props.options.map((opt) => (() => {
			var _el$6 = _tmpl$4();
			insert(_el$6, () => opt.label);
			effect(() => _el$6.value = opt.value);
			return _el$6;
		})()));
		effect((_p$) => {
			var _v$ = styles().selectContainer, _v$2 = styles().selectWrapper, _v$3 = props.description ? descriptionId : void 0, _v$4 = styles().select;
			_v$ !== _p$.e && className(_el$, _p$.e = _v$);
			_v$2 !== _p$.t && className(_el$2, _p$.t = _v$2);
			_v$3 !== _p$.a && setAttribute(_el$3, "aria-describedby", _p$.a = _v$3);
			_v$4 !== _p$.o && className(_el$3, _p$.o = _v$4);
			return _p$;
		}, {
			e: void 0,
			t: void 0,
			a: void 0,
			o: void 0
		});
		effect(() => _el$3.value = selected());
		return _el$;
	})();
}
//#endregion
export { Select };

//# sourceMappingURL=select.js.map