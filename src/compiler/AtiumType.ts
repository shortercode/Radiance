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

	constructor (type: PrimativeTypes, name: string) {
		this.type = type;
		this.name = name;
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
		compiler_error(SourceReference.unknown(), `Tuples do not have a wasm_type primative equivilent`);
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