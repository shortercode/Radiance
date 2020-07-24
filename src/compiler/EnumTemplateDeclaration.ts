import { Ref } from "../WASTNode";
import { syntax_assert } from "./error";
import { Context } from "./Context";
import { Frame } from "./Frame";
import { LangType, parse_type, EnumCaseLangType, StructLangType, EnumLangType } from "./LangType";
import { EnumTemplateInstance, EnumCaseTemplateInstance } from "./EnumTemplateInstance";
import { TypePattern } from "../parser/index";

export class EnumTemplateDeclaration {
	readonly name: string
	readonly cases: Map<string, EnumCaseTemplateDeclaration> = new Map
	readonly source: Ref
	readonly instances: EnumTemplateInstance[] = []
	readonly generics: string[]
	readonly scope: Frame[]
	
	constructor (ref: Ref, name: string, scope: Frame[], generics: string[]) {
		this.source = ref;
		this.name = name;
		this.generics = generics;
		this.scope = scope;
	}

	add_variant (name: string, variant: EnumCaseTemplateDeclaration) {
		this.cases.set(name, variant);
	}

	instance (ref: Ref, ctx: Context, args: LangType[]): EnumTemplateInstance {
		syntax_assert(args.length === this.generics.length, ref, `Struct ${this.name} expects ${this.generics.length} types but ${args.length} were given`);
		for (const inst of this.instances) {
			let matched = true;
			for (let i = 0; i < args.length; i++) {
				if (inst.generics[i].exact_equals(args[i]) === false) {
					matched = false;
					break;
				}
			}
			if (matched) {
				return inst;
			}
		}
		{
			const fn_env = ctx.fn_env;
			ctx.fn_env = null;
			const snapshot = ctx.env.swap_snapshot(this.scope);

			ctx.push_frame();
			for (let i = 0; i < this.generics.length; i++) {
				const name = this.generics[i];
				const type = args[i];
				ctx.declare_type_alias(Ref.unknown(), name, type);
			}

			const label_name = `${this.name}:<${args.map(a => a.name).join(", ")}>`;
			const parent_type: EnumLangType = new EnumLangType(label_name);
			const parent_inst: EnumTemplateInstance = {
				type: parent_type, 
				cases: new Map,
				generics: args
			};

			const case_types: Map<string, StructLangType> = new Map();
			let common_size = 4;

			for (const [name, variant] of this.cases) {
				let size = 4;
				const fields: Map<string, LangType> = new Map();

				for (const [field_name, type_pattern] of variant.fields.entries()) {
					const type = parse_type(type_pattern, ctx)
					fields.set(field_name, type);
					size += type.size;
				}
				const label_name = `${this.name}.${name}:<${args.map(a => a.name).join(", ")}>`;
				const struct_type = new StructLangType(fields, label_name);
				case_types.set(name, struct_type);
				common_size = Math.max(common_size, size);
			}

			let index = 0;
			for (const [name, type] of case_types) {
				const inst_label = type.name;
				const enum_type = new EnumCaseLangType(inst_label, parent_type, type, index);
				index += 1;
				const inst: EnumCaseTemplateInstance = {
					type: enum_type,
					name: inst_label,
					parent: parent_inst,
				};
				parent_type.add_variant(name, inst.type);
				parent_inst.cases.set(name, inst);
			}

			ctx.pop_frame();
			ctx.fn_env = fn_env;
			ctx.env.swap_snapshot(snapshot);
			this.instances.push(parent_inst);

			return parent_inst;
		}
	}
}

export class EnumCaseTemplateDeclaration {
	readonly name: string
	readonly source: Ref
	readonly parent: EnumTemplateDeclaration
	readonly fields: Map<string, TypePattern>
	
	constructor (ref: Ref, name: string, parent: EnumTemplateDeclaration, fields: Map<string, TypePattern>) {
		this.source = ref;
		this.name = name;
		this.parent = parent;
		this.fields = fields;
	}

	instance (ref: Ref, ctx: Context, generics: LangType[]): EnumCaseTemplateInstance|undefined {
		const parent_instance = this.parent.instance(ref, ctx, generics);
		return parent_instance.cases.get(this.name)
	}
}