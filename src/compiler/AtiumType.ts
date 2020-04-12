export enum PrimativeTypes {
	f32,
	f64,
	i32,
	i64,
	void,
	boolean
} 

const integer_types = new Set([
	PrimativeTypes.i32,
	PrimativeTypes.i64
]);
const float_types = new Set([
	PrimativeTypes.f32,
	PrimativeTypes.f64
]);
const numeric_types = new Set([
	...integer_types,
	...float_types
]);

export type AtiumType = PrimativeAtiumType;

class PrimativeAtiumType {
	private readonly type: PrimativeTypes
	readonly name: string

	constructor (type: PrimativeTypes, name: string) {
		this.type = type;
		this.name = name;
	}

	equals (other: AtiumType): boolean {
		return this.type === other.type;
	}

	is_numeric (): boolean {
		return numeric_types.has(this.type);
	}

	is_integer (): boolean {
		return integer_types.has(this.type);
	}

	is_float (): boolean {
		return float_types.has(this.type);
	}

	wasm_type (): PrimativeTypes {
		return this.type;
	}

	is_boolean (): boolean {
		return this.type === PrimativeTypes.boolean;
	}

	is_void (): boolean {
		return this.type === PrimativeTypes.void;
	}

	is_exportable (): boolean {
		return this.type !== PrimativeTypes.i64;
	}	
}

function validate_primative_type (str: string): PrimativeTypes {
	switch (str) {
		case "f32":
		case "f64":
		case "i32":
		case "i64":
		case "void":
		case "boolean":
		return PrimativeTypes[str];
		default:
		throw new Error(`Cannot parse type "${str}" as primative type`);
	}
}

export function parse_type (str: string) {
	const type_name = validate_primative_type(str);
	return new PrimativeAtiumType(type_name, str);
}