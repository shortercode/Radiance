import { TypePattern } from "../parser/index";
import { Context } from "./Context";
import { StructDeclaration } from "./StructDeclaration";
import { EnumDeclaration, EnumCaseDeclaration } from "./EnumDeclaration";
import { TypeAlias } from "./TypeAlias";

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
	str,
	never
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
		case PrimativeTypes.never: return "never";
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

export interface LangType {
	readonly name: string
	readonly size: number
	
	equals (other: LangType): boolean
	exact_equals (other: LangType): boolean

	is_numeric (): boolean
	is_integer (): boolean
	is_string (): boolean
	is_float (): boolean
	is_boolean (): boolean
	is_void (): boolean
	is_never (): boolean
	is_tuple (): this is TupleLangType
	is_struct (): this is StructLangType
	is_array (): this is ArrayLangType

	is_enum (): this is EnumLangType | EnumCaseLangType
	is_object_type (): boolean
	is_exportable (): boolean

	wasm_type (): PrimativeTypes
}

class PrimativeLangType implements LangType {
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

	exact_equals (other: LangType): boolean {
		return this.equals(other);
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
	
	is_boolean (): boolean {
		return this.type === PrimativeTypes.bool;
	}
	
	is_void (): boolean {
		return this.type === PrimativeTypes.void || this.is_never();
	}

	is_never (): boolean {
		return this.type === PrimativeTypes.never;
	}
	
	is_tuple (): this is TupleLangType {
		return false;
	}

	is_struct (): this is StructLangType {
		return false;
	}

	is_array (): this is ArrayLangType {
		return false;
	}

	is_enum (): this is EnumLangType | EnumCaseLangType {
		return false;
	}

	is_object_type (): boolean {
		return false;
	}

	is_exportable (): boolean {
		return this.type !== PrimativeTypes.i64;
	}

	wasm_type (): PrimativeTypes {
		return this.type;
	}
}

class ObjectLangType implements LangType {
	readonly name: string
	readonly size: number = 4

	constructor (name: string) {
		this.name = name;
	}

	equals (_other: LangType): boolean {
		throw new Error("Should not use direct instances of ObjectLangType");
	}

	exact_equals (other: LangType): boolean {
		return this.equals(other);
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

	is_never (): boolean {
		return false;
	}
	
	is_tuple (): this is TupleLangType {
		return this instanceof TupleLangType;
	}

	is_struct (): this is StructLangType {
		return this instanceof StructLangType;
	}

	is_array (): this is ArrayLangType {
		return this instanceof ArrayLangType;
	}

	is_enum (): this is EnumLangType | EnumCaseLangType {
		return this instanceof EnumLangType || this instanceof EnumCaseLangType;
	}

	is_object_type (): boolean {
		return true;
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

	exact_equals (other: LangType): boolean {
		if (other instanceof TupleLangType) {
			const a = this.types;
			const b = other.types;
			
			if (a.length !== b.length) {
				return false;
			}
			
			for (let i = 0; i < a.length; i++) {
				if (a[i].type.exact_equals(b[i].type) === false) {
					return false;
				}
			}
			return true;
		}
		return false;
	}
}

export class StructLangType extends ObjectLangType {
	readonly types: Map<string, {
		type: LangType,
		offset: number
	}>
	readonly size: number = 4
	
	constructor (types: Map<string, LangType>, name: string, initial_offset: number = 0) {
		super(name);
		this.types = this.calculate_offset(types, initial_offset);
	}

	private calculate_offset (types: Map<string, LangType>, initial_offset: number) {
		let offset = initial_offset;
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
}

export class EnumLangType extends ObjectLangType {
	readonly size: number = 4
	readonly cases: Map<string, EnumCaseLangType> = new Map

	add_variant (name: string, variant: EnumCaseLangType) {
		this.cases.set(name, variant);
	}
	
	equals (other: LangType): boolean {
		if (other instanceof EnumLangType) {
			return this === other;
		}
		if (other instanceof EnumCaseLangType) {
			for (const case_type of this.cases.values()) {
				if (case_type.equals(other)) {
					return true;
				}
			}
		}
		return false;
	}

	exact_equals (other: LangType): boolean {
		if (other instanceof EnumLangType) {
			return this === other;
		}
		return false;
	}
}

export class EnumCaseLangType extends ObjectLangType {
	readonly size: number = 4
	readonly type: StructLangType
	readonly case_index: number
	readonly parent: EnumLangType
	
	constructor (name: string, parent: EnumLangType, type: StructLangType, case_index: number) {
		super(name);
		this.parent = parent;
		this.type = type;
		this.case_index = case_index;
	}

	equals (other: LangType): boolean {
		if (other instanceof EnumCaseLangType) {
			return this === other;
		}
		return false;
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

	exact_equals (other: LangType): boolean {
		if (other instanceof ArrayLangType) {
			return this.type.exact_equals(other.type);
		}
		return false;
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
		case "boolean":
		return PrimativeTypes["bool"];
		default:
		throw new Error(`Cannot parse type "${name}" as primative type`);
	}
}

function type_pattern_name (pattern: TypePattern): string {
	if (pattern.style === "class") {
		return pattern.type;
	}
	else if (pattern.style === "member") {
		return `${type_pattern_name(pattern.type)}.${pattern.name}`;
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
			const decl = ctx.get_declaration(pattern.type);

			if (decl instanceof StructDeclaration) {
				return decl.type;
			}

			if (decl instanceof EnumDeclaration) {
				return decl.type;
			}

			if (decl instanceof EnumCaseDeclaration) {
				return decl.type;
			}

			if (decl instanceof TypeAlias) {
				return decl.type;
			}

			const type_prim = validate_primative_type(pattern.type);
			return new PrimativeLangType(type_prim, name);
		}
		case "tuple": {
			const types: Array<LangType> = pattern.types.map(type => parse_type(type, ctx));
			return new TupleLangType(types, name);
		}
		case "array": {
			const inner_type = parse_type(pattern.type, ctx);
			return new ArrayLangType(inner_type, name, pattern.count);
		}
		case "member": {
			const type_namespace = parse_type(pattern.type, ctx);

			if (type_namespace instanceof EnumLangType) {
				const subtype = type_namespace.cases.get(pattern.name);
				if (!subtype) {
					throw new Error(`"${pattern.name}" is not a variant of "${type_namespace.name}"`)
				}
				return subtype;
			}
			else {
				throw new Error(`"${type_namespace.name}" is not an enum`);
			}	
		}
	}
}

export const BOOL_TYPE = new PrimativeLangType(PrimativeTypes.bool, "bool");
export const VOID_TYPE = new PrimativeLangType(PrimativeTypes.void, "void");
export const F32_TYPE = new PrimativeLangType(PrimativeTypes.f32, "f32");
export const F64_TYPE = new PrimativeLangType(PrimativeTypes.f64, "f64");
export const I32_TYPE = new PrimativeLangType(PrimativeTypes.i32, "i32");
export const I64_TYPE = new PrimativeLangType(PrimativeTypes.i64, "i64");
export const STR_TYPE = new PrimativeLangType(PrimativeTypes.str, "str");
export const NEVER_TYPE = new PrimativeLangType(PrimativeTypes.never, "never");