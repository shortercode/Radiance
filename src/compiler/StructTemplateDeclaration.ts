import { Ref } from "../WASTNode";
import { TypePattern } from "../parser/index";
import { StructTemplateInstance } from "./StructTemplateInstance";
import { syntax_assert } from "./error";
import { LangType, parse_type, StructLangType } from "./LangType";
import { Context } from "./Context";
import { Frame } from "./Frame";

export class StructTemplateDeclaration {
	readonly name: string
	readonly fields: Map<string, TypePattern>
	readonly generics: string[]
	readonly instances: StructTemplateInstance[] = []
	readonly scope: Frame[]
	
	constructor (name: string, scope: Frame[], fields: Map<string, TypePattern>, generics: string[]) {
		this.name = name;
		this.fields = fields;
		this.generics = generics;
		this.scope = scope;
	}

	instance (ref: Ref, ctx: Context, args: LangType[]): StructTemplateInstance {

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
			let size = 0;
			const fields: Map<string, LangType> = new Map();
			for (const [name, type_pattern] of this.fields.entries()) {
				const type = parse_type(type_pattern, ctx)
				fields.set(name, type);
				size += type.size;
			}
			const struct_type = new StructLangType(fields, this.name);
			const inst: StructTemplateInstance = {
				type: struct_type,
				name: this.name,
				generics: args,
				size,
				fields
			};

			ctx.pop_frame();
			ctx.fn_env = fn_env;
			ctx.env.swap_snapshot(snapshot);
			this.instances.push(inst);

			return inst;
		}
	}
}