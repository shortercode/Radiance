import { FunctionDeclaration } from "./FunctionDeclaration";
import { Environment } from "./Environment";
import { LangType, StructLangType } from "./LangType";
import { Variable } from "./Variable";
import { syntax_assert, compiler_assert } from "./error";
import { StructDeclaration } from "./StructDeclaration";
import { WASTDataNode, Ref } from "../WASTNode";
import { EnumDeclaration, EnumCaseDeclaration } from "./EnumDeclaration";

export class Context {

	user_globals: Map<string, EnumDeclaration|FunctionDeclaration|Variable|StructDeclaration> = new Map
	lib_globals: Map<string, FunctionDeclaration|Variable> = new Map

	global_variables: Array<Variable> = []
	data_blocks: Array<WASTDataNode> = []
	exports: Set<string> = new Set

	private environment: Environment | null = null	
	private unsafe_mode = false

	get is_unsafe (): boolean {
		return this.unsafe_mode;
	}

	get is_inside_function (): boolean {
		return this.environment !== null;
	}

	get_environment (ref: Ref): Environment {
		compiler_assert(this.is_inside_function, ref, `Cannot access function environment. Not currently inside a function body.`);
		return this.environment!;
	}

	create_function_environment (ref: Ref, decl: FunctionDeclaration) {
		compiler_assert(this.is_inside_function === false, ref, `Cannot create function environment. Currently inside a function body.`);
		this.environment = new Environment(decl);
	}

	exit_function_environment () {
		this.environment = null;
	}

	enable_unsafe () {
		this.unsafe_mode = true;
	}

	disable_unsafe () {
		this.unsafe_mode = false;
	}

	define_export (ref: Ref, name: string) {
		syntax_assert(!this.exports.has(name), ref, `An export with the name "${name}" has already been defined`);
		this.exports.add(name);
	}

	declare_variable (ref: Ref, name: string, type: LangType): Variable {
		if (this.is_inside_function) {
			return this.get_environment(ref).declare(ref, name, type);
		}
		else {
			return this.declare_global_variable(ref, name, type);
		}
	}
	
	declare_function (ref: Ref, name: string, type: LangType, parameters: Array<Variable>): FunctionDeclaration {
		syntax_assert(this.is_inside_function === false, ref, `Cannot declare function ${name} because it's in a local scope`);
		syntax_assert(this.user_globals.has(name) === false, ref, `Global ${name} already exists`)

		const fn = this.create_function(name, type, parameters);
		
		this.user_globals.set(name, fn);
		return fn;
	}

	declare_struct (ref: Ref, name: string, fields: Map<string, LangType>) {
		syntax_assert(this.user_globals.has(name) === false, ref, `Global ${name} already exists`)
		const struct = this.declare_hidden_struct(ref, name, fields);
		this.user_globals.set(name, struct);
		return struct;
	}

	declare_enum (ref: Ref, name: string, case_patterns: Map<string, Map<string, LangType>>): EnumDeclaration {
		syntax_assert(this.user_globals.has(name) === false, ref, `Global ${name} already exists`)
		
		const cases: Map<string, EnumCaseDeclaration> = new Map;
		const case_structs: [string, StructLangType][] = [];
		let enum_size = 4;

		for (const [case_name, case_fields] of case_patterns) {
			let struct_size = 0;
			for (const field of case_fields.values()) {
				struct_size += field.size;
			}
			const struct_type = new StructLangType(case_fields, name);
			case_structs.push([case_name, struct_type]);
			enum_size = Math.max(enum_size, struct_size + 4);
		}

		const enumerable = new EnumDeclaration(ref, name, enum_size);

		let case_index = 0;

		for (const [case_name, case_struct] of case_structs) { 
			const type_label = `${name}.${case_name}`;
			const case_decl = new EnumCaseDeclaration(ref, type_label, enumerable, case_struct, enum_size, case_index);
			enumerable.add_variant(case_name, case_decl);
			case_index += 1;
			cases.set(case_name, case_decl);
		}
		
		this.user_globals.set(name, enumerable);
		return enumerable;
	}

	declare_hidden_struct (ref: Ref, name: string, fields: Map<string, LangType>) {
		return new StructDeclaration(ref, name, fields);
	}

	declare_hidden_function (name: string, type: LangType, parameters: Array<Variable>): FunctionDeclaration {
		return this.create_function(name, type, parameters);
	}

	declare_library_function (ref: Ref, name: string, type: LangType, parameters: Array<Variable>): FunctionDeclaration {
		syntax_assert(this.lib_globals.has(name) === false, ref, `Global ${name} already exists`)

		const fn = this.create_function(name, type, parameters);
		
		this.lib_globals.set(name, fn);
		return fn;
	}

	private create_function (name: string, type: LangType, parameters: Array<Variable>): FunctionDeclaration {
		return new FunctionDeclaration(name, type, parameters);
	}

	declare_global_variable (ref: Ref, name: string, type: LangType): Variable {
		syntax_assert(this.user_globals.has(name) === false, ref, `Global ${name} already exists`)
		const global_var = this.create_global_variable(ref, name, type);
		this.user_globals.set(name, global_var);
		return global_var;
	}

	declare_library_global_variable (ref: Ref, name: string, type: LangType): Variable {
		compiler_assert(this.lib_globals.has(name) === false, ref, `Global ${name} already exists`)
		const global_var = this.create_global_variable(ref, name, type);
		this.lib_globals.set(name, global_var);
		return global_var;
	}

	private create_global_variable (ref: Ref, name: string, type: LangType): Variable {
		const global_var = new Variable(ref, type, name, true);
		this.global_variables.push(global_var);
		return global_var;
	}

	get_function (name: string): FunctionDeclaration | null {
		const global_fn = this.user_globals.get(name);
		if (global_fn instanceof FunctionDeclaration) {
			return global_fn;
		}
		else {
			return null
		}
	}

	get_struct (name: string): StructDeclaration | null {
		const global_struct = this.user_globals.get(name);
		if (global_struct instanceof StructDeclaration) {
			return global_struct;
		}
		else {
			return null;
		}
	}

	get_enum (name: string): EnumDeclaration | null {
		const global_enum = this.user_globals.get(name);
		if (global_enum instanceof EnumDeclaration	) {
			return global_enum;
		}
		else {
			return null;
		}
	}
	
	get_variable (ref: Ref, name: string): Variable | null {
		if (this.is_inside_function) {
			const local_var = this.get_environment(ref).get_variable(name);
			if (local_var) {
				return local_var;
			}
		}

		const global_var = this.user_globals.get(name);
		if (global_var instanceof Variable) {
			return global_var;
		}

		return null;
	}

	create_data_block (ref: Ref, bytes: Uint8Array): WASTDataNode {
		const block = new WASTDataNode(ref, bytes);
		this.data_blocks.push(block);
		return block;
	}
}