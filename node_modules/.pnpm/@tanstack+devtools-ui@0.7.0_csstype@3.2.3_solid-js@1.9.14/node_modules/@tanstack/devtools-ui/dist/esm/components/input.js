import { createStyles } from "../styles/use-styles.js";
import { className, delegateEvents, effect, insert, memo, setAttribute, template } from "solid-js/web";
import { createSignal, createUniqueId } from "solid-js";
//#region src/components/input.tsx
var _tmpl$ = /* @__PURE__ */ template(`<div><div><input data-tsd-control>`), _tmpl$2 = /* @__PURE__ */ template(`<label>`), _tmpl$3 = /* @__PURE__ */ template(`<p>`);
function Input(props) {
	const styles = createStyles();
	const [val, setVal] = createSignal(props.value || "");
	const id = createUniqueId();
	const descriptionId = `${id}-description`;
	const handleChange = (e) => {
		const value = e.target.value;
		setVal((prev) => prev !== value ? value : prev);
		props.onChange?.(value);
	};
	return (() => {
		var _el$ = _tmpl$(), _el$2 = _el$.firstChild, _el$3 = _el$2.firstChild;
		insert(_el$2, (() => {
			var _c$ = memo(() => !!props.label);
			return () => _c$() && (() => {
				var _el$4 = _tmpl$2();
				setAttribute(_el$4, "for", id);
				insert(_el$4, () => props.label);
				effect(() => className(_el$4, styles().inputLabel));
				return _el$4;
			})();
		})(), _el$3);
		insert(_el$2, (() => {
			var _c$2 = memo(() => !!props.description);
			return () => _c$2() && (() => {
				var _el$5 = _tmpl$3();
				setAttribute(_el$5, "id", descriptionId);
				insert(_el$5, () => props.description);
				effect(() => className(_el$5, styles().inputDescription));
				return _el$5;
			})();
		})(), _el$3);
		_el$3.$$input = handleChange;
		setAttribute(_el$3, "id", id);
		effect((_p$) => {
			var _v$ = styles().inputContainer, _v$2 = styles().inputWrapper, _v$3 = props.description ? descriptionId : void 0, _v$4 = props.type || "text", _v$5 = styles().input, _v$6 = props.placeholder;
			_v$ !== _p$.e && className(_el$, _p$.e = _v$);
			_v$2 !== _p$.t && className(_el$2, _p$.t = _v$2);
			_v$3 !== _p$.a && setAttribute(_el$3, "aria-describedby", _p$.a = _v$3);
			_v$4 !== _p$.o && setAttribute(_el$3, "type", _p$.o = _v$4);
			_v$5 !== _p$.i && className(_el$3, _p$.i = _v$5);
			_v$6 !== _p$.n && setAttribute(_el$3, "placeholder", _p$.n = _v$6);
			return _p$;
		}, {
			e: void 0,
			t: void 0,
			a: void 0,
			o: void 0,
			i: void 0,
			n: void 0
		});
		effect(() => _el$3.value = val());
		return _el$;
	})();
}
delegateEvents(["input"]);
//#endregion
export { Input };

//# sourceMappingURL=input.js.map