type PrimativeTypes = "f32" | "f64" | "i32" | "i64" | "void";

export type AtiumType = PrimativeTypes | "boolean";

export function is_numeric (type: AtiumType) {
	switch (type) {
		case "f32":
		case "f64":
		case "i32":
		case "i64":
		return true;
		default:
		return false;
	}
}

export function is_integer (type: AtiumType) {
	return type === "i32" || type === "i64";
}

export function validate_atium_type(type: string): AtiumType {
	// TODO this will need changing when we add objects
	switch (type) {
		case "boolean":
		case "void":
		case "f32":
		case "f64":
		case "i32":
		case "i64":
		return type;
		default:
		throw new Error(`Illegal type ${type}`);
	}
}

export function compare_atium_types(a: AtiumType, b: AtiumType): boolean {
	// TODO this will need changing when we add objects
	return a === b;
}