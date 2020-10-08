import { LangType, EnumCaseLangType, create_array_type } from "./LangType";
import { TypeHint } from "./core";

export function find_common_type (a: LangType, b: LangType, ignore_never: boolean = false): TypeHint {

	if (ignore_never) {
		if (a.is_never()) {
			return b;
		}
		if (b.is_never()) {
			return a;
		}
	}

	if (a.exact_equals(b)) {
		return a;
	}
	else if (a.is_enum() && b.is_enum()) {
		if (a instanceof EnumCaseLangType) {
			a = a.parent;
		}
		if (b instanceof EnumCaseLangType) {
			b = b.parent;
		}

		if (a.equals(b)) {
			return a;
		}
	}
	else if (a.is_array() && b.is_array()) {
		let count = a.count;

		if (a.count !== b.count) {
			count = -1;
		}
		if (a.type.equals(b.type) === false) {
			const common_type = find_common_type(a.type, b.type);
			if (common_type) {
				return create_array_type(a.type, count);
			}
		}
		else {
			return create_array_type(a.type, count);
		}
	}
	return null;
}