import { compiler_error } from "./error";
import { SourceReference } from "../WASTNode";

export enum PrimativeTypes {
	f32,
	f64,
	i32,
	i64,
	void,
	boolean
}

export function get_primative_name (type: PrimativeTypes): string {
	switch (type) {
		case PrimativeTypes.f32: return "f32";
		case PrimativeTypes.f64: return "f64";
		case PrimativeTypes.i32: return "i32";
		case PrimativeTypes.i64: return "i64";
		case PrimativeTypes.void: return "void";
		case PrimativeTypes.boolean: return "boolean";
	}
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

export type AtiumType = PrimativeAtiumType | TupleAtiumType;

class PrimativeAtiumType {
	private readonly type: PrimativeTypes
	readonly name: string
	readonly size: number

	constructor (type: PrimativeTypes, name: string) {
		this.type = type;
		this.name = name;

		if (this.type === PrimativeTypes.f64 || this.type === PrimativeTypes.i64) {
			this.size = 8;
		}
		else {
			this.size = 4;
		}
	}

	equals (other: AtiumType): boolean {
		if (other instanceof PrimativeAtiumType) {
			return this.type === other.type;
		}
		return false;
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

// NOTE if we ever introduce type aliasing then we need to ensure that a tuple cannot recursively hold itself
// otherwise it could have infinite size

class TupleAtiumType {
	private readonly types: Array<AtiumType>
	readonly name: string
	readonly size: number = 4

	constructor (types: Array<AtiumType>, name: string) {
		this.types = types;
		this.name = name;
	}

	equals (other: AtiumType): boolean {
		if (other instanceof TupleAtiumType) {
			const a = this.types;
			const b = other.types;

			if (a.length !== b.length) {
				return false;
			}

			for (let i = 0; i < length; i++) {
				if (a[i].equals(b[i]) === false) {
					return false;
				}
			}
		}
		return false;
	}

	is_numeric (): boolean {
		return false;
	}

	is_integer (): boolean {
		return false;
	}

	is_float (): boolean {
		return false;
	}

	wasm_type (): PrimativeTypes {
		return PrimativeTypes.i32;
		// compiler_error(SourceReference.unknown(), `Tuples do not have a wasm_type primative equivilent`);
	}

	is_boolean (): boolean {
		return false;
	}

	is_void (): boolean {
		return false;
	}

	is_exportable (): boolean {
		return false;
	}
}

export type TypePattern = { style: "tuple", types: Array<TypePattern> } | { style: "class", type: string };

function validate_primative_type (name: string): PrimativeTypes {
	switch (name) {
		case "f32":
		case "f64":
		case "i32":
		case "i64":
		case "void":
		case "boolean":
		return PrimativeTypes[name];
		default:
		throw new Error(`Cannot parse type "${name}" as primative type`);
	}
}

function type_pattern_name (pattern: TypePattern): string {
	if (pattern.style === "class") {
		return pattern.type;
	}
	else {
		return `(${pattern.types.join(",")})`;
	}
}

export function create_tuple_type (types: Array<AtiumType>) {
	const name = `(${types.map(t => t.name).join(",")})`;
	return new TupleAtiumType(types, name);
}

export function parse_type (pattern: TypePattern): AtiumType {
	const name = type_pattern_name(pattern);
	if (pattern.style === "class") {
		const type_enum = validate_primative_type(pattern.type);
		return new PrimativeAtiumType(type_enum, name);
	}
	else {
		const types: Array<AtiumType> = pattern.types.map(type => parse_type(type));
		return new TupleAtiumType(types, name);
	}
}

export const BOOL_TYPE = new PrimativeAtiumType(PrimativeTypes.boolean, "boolean");
export const VOID_TYPE = new PrimativeAtiumType(PrimativeTypes.void, "void");
export const F64_TYPE = new PrimativeAtiumType(PrimativeTypes.f64, "f64");
export const I32_TYPE = new PrimativeAtiumType(PrimativeTypes.i32, "i32");