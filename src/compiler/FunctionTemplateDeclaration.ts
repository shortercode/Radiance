import { TypePattern } from "../parser/index"
import { FunctionTemplateInstance } from "./FunctionTemplateInstance"
import { Frame } from "./Frame"
import { AST } from "./core"
import { Context } from "./Context"
import { Ref } from "../WASTNode"
import { LangType, parse_type } from "./LangType"
import { syntax_assert } from "./error"
import { Variable } from "./Variable"

type ParameterPattern = {
	name: string, type: TypePattern
}

export class FunctionTemplateDeclaration {
	readonly type: TypePattern
	readonly parameters: ParameterPattern[]
	readonly name: string
	readonly generics: string[]
	readonly instances: FunctionTemplateInstance[] = []
	readonly scope: Frame[]
	readonly body: AST[]
	
	constructor (name: string, type: TypePattern, scope: Frame[], parameters: ParameterPattern[], generics: string[], body: AST[]) {
		this.type = type;
		this.name = name;
		this.parameters = parameters;
		this.generics = generics;
		this.scope = scope;
		this.body = body;
	}

	is_template (): boolean {
		return this.generics.length > 0;
	}

	instance (ref: Ref, ctx: Context, args: LangType[]): FunctionTemplateInstance {

		syntax_assert(args.length === this.generics.length, ref, `Function ${this.name} expects ${this.generics.length} types but ${args.length} were given`);
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
			const return_type = parse_type(this.type, ctx);
			const parameters = this.parameters.map(par => {
				const type = parse_type(par.type, ctx);
				return new Variable(Ref.unknown(), type, par.name)
			});
			const inst = {
				type: return_type,
				id: Symbol(this.name),
				name: this.name,
				parameters,
				generics: args,
				body: this.body
			};

			ctx.pop_frame();
			ctx.fn_env = fn_env;
			ctx.env.swap_snapshot(snapshot);
			this.instances.push(inst);

			return inst;
		}
	}
}