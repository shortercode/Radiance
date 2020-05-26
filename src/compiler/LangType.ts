import { TypePattern } from "../parser/index";
import { Context } from "./Context";

// NOTE this allows us to return pointers to the host environment
// which is cool but the host environment will likely not be able
// to read from the struct... also it's kinda risky if the host is
// passing in invalid pointers!
const ALLOW_POINTER_EXPORTS = true;

export enum PrimativeTypes {
	f32,
	f64,
	i32,
	i64,
	u32,
	u64,
	void,
	bool,
	str
}

export function get_primative_name (type: PrimativeTypes): string {
	switch (type) {
		case PrimativeTypes.f32: return "f32";
		case PrimativeTypes.f64: return "f64";
		case PrimativeTypes.i32: return "i32";
		case PrimativeTypes.i64: return "i64";
		case PrimativeTypes.u32: return "u32";
		case PrimativeTypes.u64: return "u64";
		case PrimativeTypes.void: return "void";
		case PrimativeTypes.bool: return "bool";
		case PrimativeTypes.str: return "str";
	}
}

const integer_types = new Set([
	PrimativeTypes.i32,
	PrimativeTypes.i64,
	PrimativeTypes.u32,
	PrimativeTypes.u64
]);
const float_types = new Set([
	PrimativeTypes.f32,
	PrimativeTypes.f64
]);
const numeric_types = new Set([
	...integer_types,
	...float_types
]);

export type LangType = PrimativeLangType | TupleLangType | StructLangType | ArrayLangType;

class PrimativeLangType {
	private readonly type: PrimativeTypes
	readonly name: string
	readonly size: number

	constructor (type: PrimativeTypes, name: string) {
		this.type = type;
		this.name = name;

		if (this.type === PrimativeTypes.f64 || this.type === PrimativeTypes.i64 || this.type === PrimativeTypes.u64) {
			this.size = 8;
		}
		else {
			this.size = 4;
		}
	}

	equals (other: LangType): boolean {
		if (other instanceof PrimativeLangType) {
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

	is_string (): boolean {
		return this.type === PrimativeTypes.str;
	}

	is_float (): boolean {
		return float_types.has(this.type);
	}

	wasm_type (): PrimativeTypes {
		return this.type;
	}

	is_boolean (): boolean {
		return this.type === PrimativeTypes.bool;
	}

	is_void (): boolean {
		return this.type === PrimativeTypes.void;
	}

	as_tuple (): null {
		return null;
	}

	as_struct (): null {
		return null;
	}

	as_array (): null {
		return null;
	}

	is_exportable (): boolean {
		return this.type !== PrimativeTypes.i64;
	}
}

class ObjectLangType {
	readonly name: string
	readonly size: number = 4

	constructor (name: string) {
		this.name = name;
	}

	equals (_other: LangType): boolean {
		throw new Error("Should not use direct instances of AtiumObjectType");
	}

	is_numeric (): boolean {
		return false;
	}

	is_integer (): boolean {
		return false;
	}

	is_string (): boolean {
		return false;
	}

	is_float (): boolean {
		return false;
	}

	wasm_type (): PrimativeTypes {
		return PrimativeTypes.i32;
	}

	is_boolean (): boolean {
		return false;
	}

	is_void (): boolean {
		return false;
	}

	as_tuple (): TupleLangType | null {
		return null;
	}

	as_struct (): StructLangType | null {
		return null;
	}

	as_array (): ArrayLangType | null {
		return null;
	}

	is_exportable (): boolean {
		return ALLOW_POINTER_EXPORTS;
	}
}

export class TupleLangType extends ObjectLangType{
	readonly types: Array<{
		type: LangType,
		offset: number
	}>
	readonly size: number = 4

	constructor (types: Array<LangType>, name: string) {
		super(name);
		this.types = this.calculate_offset(types);
	}

	private calculate_offset (types: Array<LangType>) {
		let offset = 0;
		return types.map((type: LangType) => {
			const result = {
				type,
				offset
			};
			offset += type.size;
			return result;
		});
	}

	equals (other: LangType): boolean {
		if (other instanceof TupleLangType) {
			const a = this.types;
			const b = other.types;

			if (a.length !== b.length) {
				return false;
			}

			for (let i = 0; i < a.length; i++) {
				if (a[i].type.equals(b[i].type) === false) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	as_tuple (): TupleLangType {
		return this;
	}
}

export class StructLangType extends ObjectLangType {
	readonly types: Map<string, {
		type: LangType,
		offset: number
	}>
	readonly size: number = 4

	constructor (types: Map<string, LangType>, name: string) {
		super(name);
		this.types = this.calculate_offset(types);
	}

	private calculate_offset (types: Map<string, LangType>) {
		let offset = 0;
		const result: Map<string, {
			type: LangType,
			offset: number
		}> = new Map;
		for (const [name, type] of types) {
			result.set(name, {
				type,
				offset
			});
			offset += type.size;
		}
		return result;
	}

	equals (other: LangType): boolean {
		if (other instanceof StructLangType) {
			// we dont support structural typing, so we can use direct comparison
			return this === other;
		}
		return false;
	}

	as_struct (): StructLangType {
		return this;
	}
}

export class ArrayLangType extends ObjectLangType {
	readonly type: LangType
	readonly size: number = 4
	readonly count: number

	constructor (type: LangType, name: string, count: number) {
		super(name);
		this.type = type;
		this.count = count;
	}

	is_sized () {
		return this.count >= 0;
	}

	equals (other: LangType): boolean {
		if (other instanceof ArrayLangType) {
			return this.type.equals(other.type) && (this.is_sized() ? this.count === other.count : true);
		}
		return false;
	}

	as_array (): ArrayLangType {
		return this;
	}
}

function validate_primative_type (name: string): PrimativeTypes {
	switch (name) {
		case "f32":
		case "f64":
		case "i32":
		case "i64":
		case "u32":
		case "u64":
		case "void":
		case "bool":
		case "str":
		return PrimativeTypes[name];
		case "string":
		return PrimativeTypes["str"];
		case "number":
		return PrimativeTypes["f64"];
		default:
		throw new Error(`Cannot parse type "${name}" as primative type`);
	}
}

function type_pattern_name (pattern: TypePattern): string {
	if (pattern.style === "class") {
		return pattern.type;
	}
	else if (pattern.style === "tuple") {
		return `(${pattern.types.map(type => type_pattern_name(type)).join(",")})`;
	}
	else {
		const size_label = pattern.count < 0 ? "" : pattern.count.toString();
		return `${type_pattern_name(pattern.type)}[${size_label}]`;
	}
}

export function create_tuple_type (types: Array<LangType>) {
	const name = `(${types.map(t => t.name).join(",")})`;
	return new TupleLangType(types, name);
}

export function create_array_type (type: LangType, count: number) {
	const size_label = count < 0 ? "" : count.toString();
	const name = `${type.name}[${size_label}]`;
	return new ArrayLangType(type, name, count);
}

export function parse_type (pattern: TypePattern, ctx: Context): LangType {
	const name = type_pattern_name(pattern);
	switch (pattern.style) {
		case "class": {
			const struct_decl = ctx.get_struct(pattern.type);

			if (struct_decl) {
				return struct_decl.type;
			}
			else {
				const type_enum = validate_primative_type(pattern.type);
				return new PrimativeLangType(type_enum, name);
			}
		}
		case "tuple": {
			const types: Array<LangType> = pattern.types.map(type => parse_type(type, ctx));
			return new TupleLangType(types, name);
		}
		case "array": {
			const inner_type = parse_type(pattern.type, ctx);
			return new ArrayLangType(inner_type, name, pattern.count);
		}
	}
}

export const BOOL_TYPE = new PrimativeLangType(PrimativeTypes.bool, "bool");
export const VOID_TYPE = new PrimativeLangType(PrimativeTypes.void, "void");
export const F64_TYPE = new PrimativeLangType(PrimativeTypes.f64, "f64");
export const I32_TYPE = new PrimativeLangType(PrimativeTypes.i32, "i32");
export const I64_TYPE = new PrimativeLangType(PrimativeTypes.i64, "i64");
export const STR_TYPE = new PrimativeLangType(PrimativeTypes.str, "str");