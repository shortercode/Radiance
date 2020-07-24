import { Variable } from "./Variable";
import { EnumDeclaration, EnumCaseDeclaration } from "./EnumDeclaration";
import { StructDeclaration } from "./StructDeclaration";
import { FunctionDeclaration } from "./FunctionDeclaration";
import { LangType, StructLangType } from "./LangType";
import { Ref, WASTDataNode } from "../WASTNode";
import { syntax_assert, compiler_assert } from "./error";
import { TypeAlias } from "./TypeAlias";
import { Declaration } from "./Declaration";
import { ModuleEnvironment, FunctionEnvironment } from "./Environment";
import { TypePattern } from "../parser/index";
import { AST } from "./core";
import { FunctionTemplateDeclaration } from "./FunctionTemplateDeclaration";
import { StructTemplateDeclaration } from "./StructTemplateDeclaration";
import { EnumTemplateDeclaration, EnumCaseTemplateDeclaration } from "./EnumTemplateDeclaration";

export class Context {
	readonly env: ModuleEnvironment = new ModuleEnvironment()
	fn_env: FunctionEnvironment | null = null

	readonly globals: Variable[] = []
	readonly function_templates: FunctionTemplateDeclaration[] = []
	readonly data: WASTDataNode[] = []
	readonly exports: Set<string> = new Set
	readonly sys_globals: Map<string, Declaration> = new Map

	unsafe_mode: boolean = false

	declare_variable (ref: Ref, name: string, type: LangType): Variable {
		const variable = new Variable(ref, type, name);
		this.declare(ref, name, variable);
		if (variable.is_global) {
			this.globals.push(variable);
		}
		return variable;
	}
	declare_function (ref: Ref, name: string, return_type: LangType, parameters: Variable[]): FunctionDeclaration {
		const decl = new FunctionDeclaration(name, return_type, parameters);
		this.declare(ref, name, decl);
		return decl;
	}
	declare_function_template (ref: Ref, name: string, return_type: TypePattern, parameters: { name: string, type: TypePattern }[], generics: string[], body: AST[]) {
		const scope = this.env.snapshot();
		const decl = new FunctionTemplateDeclaration(name, return_type, scope, parameters, generics, body);
		this.declare(ref, name, decl);
		this.function_templates.push(decl);
		return decl;
	}
	declare_struct (ref: Ref, name: string, fields: Map<string, LangType>): StructDeclaration {
		const decl = new StructDeclaration(ref, name, fields);
		this.declare(ref, name, decl);
		return decl;
	}
	declare_struct_template (ref: Ref, name: string, fields: Map<string, TypePattern>, generics: string[]): StructTemplateDeclaration {
		const scope = this.env.snapshot();
		const decl = new StructTemplateDeclaration(name, scope, fields, generics);
		this.declare(ref, name, decl);
		return decl;
	}
	declare_enum (ref: Ref, name: string, case_patterns: Map<string, Map<string, LangType>>): EnumDeclaration {
		const cases: Map<string, EnumCaseDeclaration> = new Map;
		const case_structs: [string, StructLangType][] = [];
		let enum_size = 4;

		for (const [case_name, case_fields] of case_patterns) {
			let struct_size = 4;
			for (const field of case_fields.values()) {
				struct_size += field.size;
			}
			const struct_type = new StructLangType(case_fields, name);
			case_structs.push([case_name, struct_type]);
			enum_size = Math.max(enum_size, struct_size);
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
		this.declare(ref, name, enumerable);
		return enumerable;
	}
	declare_enum_template (ref: Ref, name: string, cases: Map<string, Map<string, TypePattern>>, generics: string[]): EnumTemplateDeclaration {
		const scope = this.env.snapshot();
		const enum_template = new EnumTemplateDeclaration(ref, name, scope, generics);
		for (const [name, fields] of cases) {
			const variant_template = new EnumCaseTemplateDeclaration(ref, name, enum_template, fields);
			enum_template.add_variant(name, variant_template);
		}
		this.declare(ref, name, enum_template);
		return enum_template;
	}
	declare_type_alias (ref: Ref, name: string, type: LangType): TypeAlias {
		const alias = new TypeAlias(ref, name, type);
		this.declare(ref, name, alias);
		return alias;
	}

	private declare (ref: Ref, name: string, decl: Declaration) {
		if (this.fn_env) {
			this.fn_env.declare(ref, name, decl);
		}
		this.env.declare(ref, name, decl);
	}
	
	get_variable (name: string): Variable | null {
		const decl = this.get_declaration(name);
		if (decl instanceof Variable) {
			return decl;
		}
		return null;
	}
	get_function (name: string): FunctionDeclaration | null {
		const decl = this.get_declaration(name);
		if (decl instanceof FunctionDeclaration) {
			return decl;
		}
		return null;
	}
	get_struct (name: string): StructDeclaration | null {
		const decl = this.get_declaration(name);
		if (decl instanceof StructDeclaration) {
			return decl;
		}
		return null;
	}
	get_enum (name: string): EnumDeclaration | null {
		const decl = this.get_declaration(name);
		if (decl instanceof EnumDeclaration) {
			return decl;
		}
		return null;
	}
	get_alias (name: string): TypeAlias | null {
		const decl = this.get_declaration(name);
		if (decl instanceof TypeAlias) {
			return decl;
		}
		return null;
	}

	get_temp_variable (type: LangType): [Variable, () => void] {
		if (this.fn_env) {
			const env = this.fn_env;
			const variable = env.get_temp_variable(type);
			return [variable, () => env.free_temp_variable(variable)];
		}
		else {
			const variable = this.env.get_temp_variable(type); 
			return [variable, () => this.env.free_temp_variable(variable)];
		}
	}

	get_declaration (name: string): Declaration | null {
		let decl: Declaration|null = null;
		if (this.fn_env) {
			decl = this.fn_env.get(name);
		}
		if (!decl) {
			decl = this.env.get(name);
		}
		return decl;
	}

	declare_sys_variable (ref: Ref, name: string, type: LangType): Variable {
		const variable = new Variable(ref, type, name);
		variable.is_global = true;
		this.declare_sys_global(ref, name, variable);
		this.globals.push(variable);
		return variable;
	}

	private declare_sys_global (ref: Ref, name: string, decl: Declaration) {
		// NOTE this is considered a compiler_assert because it cannot currently be
		// used via userland
		compiler_assert(this.sys_globals.has(name) === false, ref, `Unable to declare global "${name}", as it's already been declared.`);
		this.sys_globals.set(name, decl);
	}

	get_sys_variable (name: string): Variable | null {
		const decl = this.sys_globals.get(name);
		if (decl instanceof Variable) {
			return decl;
		}
		return null;
	}

	define_export (ref: Ref, name: string) {
		syntax_assert(this.exports.has(name) === false, ref, `An export with the name "${name}" has already been defined`);
		this.exports.add(name);
	}

	define_data (ref: Ref, bytes: Uint8Array): WASTDataNode {
		const block = new WASTDataNode(ref, bytes);
		this.data.push(block);
		return block;
	}

	pop_frame () {
		if (this.fn_env) {
			this.fn_env.pop();
		}
		this.env.pop();
	}

	push_frame () {
		if (this.fn_env) {
			this.fn_env.push();
		}
		this.env.push();
	}
}