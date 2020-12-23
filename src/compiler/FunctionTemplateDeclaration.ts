import { TypePattern } from "../parser/index"
import { FunctionTemplateInstance } from "./FunctionTemplateInstance"
import { Frame } from "./Frame"
import { AST, TypeHint } from "./core"
import { Context } from "./Context"
import { Ref } from "../WASTNode"
import { LangType, parse_type, LateLangType } from "./LangType"
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

	instance (ref: Ref, ctx: Context, generic_args: LangType[], return_hint: TypeHint): { instance: FunctionTemplateInstance, lock: () => void } {
		const late_types: LateLangType[] = [];
		if (generic_args.length < this.generics.length) {
			const l = this.generics.length;
			for (let i = generic_args.length; i < l; i++) {
				const type = new LateLangType(ref, this.generics[i]);
				generic_args.push(type);
				late_types.push(type);
			}
		}
		syntax_assert(generic_args.length === this.generics.length, ref, `Function ${this.name} expects ${this.generics.length} types but ${generic_args.length} were given`);
		{
			const fn_env = ctx.fn_env;
			ctx.fn_env = null;
			const snapshot = ctx.env.swap_snapshot(this.scope);

			ctx.push_frame();
			for (let i = 0; i < this.generics.length; i++) {
				const name = this.generics[i];
				const type = generic_args[i];
				ctx.declare_type_alias(Ref.unknown(), name, type);
			}
			const return_type = parse_type(this.type, ctx, return_hint?.resolve());
			const parameters = this.parameters.map((par) => {
				const type = parse_type(par.type, ctx, null);
				return new Variable(Ref.unknown(), type, par.name)
			});

			const instance: FunctionTemplateInstance = {
				type: return_type,
				id: Symbol(this.name),
				name: this.name,
				parameters,
				generics: generic_args,
				generic_names: this.generics,
				scope: this.scope,
				body: this.body
			};

			ctx.pop_frame();
			ctx.fn_env = fn_env;
			ctx.env.swap_snapshot(snapshot);

			return {
				instance,
				lock: () => {
					for (const type of late_types) {
						const inner_type = type.lock(ref);
						const i = generic_args.indexOf(type);
						generic_args[i] = inner_type;
					}
					for (const inst of this.instances) {
						let matched = true;
						for (let i = 0; i < generic_args.length; i++) {
							if (inst.generics[i].exact_equals(generic_args[i]) === false) {
								matched = false;
								break;
							}
						}
						if (matched) {
							return;
						}
					}
					this.instances.push(instance);
				}
			}
		}
	}
}