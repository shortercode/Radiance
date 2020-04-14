import { FunctionDeclaration } from "./FunctionDeclaration.js";
import { Environment } from "./Environment.js";
import { AtiumType } from "./AtiumType.js";
import { Variable } from "./Variable.js";
import { syntax_assert } from "./error.js";
import { SourceReference } from "../WASTNode.js";

export class Context {
	globals: Map<string, FunctionDeclaration> = new Map
	environment: Environment | null = null

	private function_index = 0
	
	declare_variable (name: string, type: AtiumType): Variable {
		if (this.environment === null) {
			throw new Error("Cannot declare global variable");
		}
		
		return this.environment.declare(name, type);
	}
	
	declare_function (ref: SourceReference, name: string, type: AtiumType, parameters: Array<Variable>) {
		syntax_assert(this.environment === null, ref, `Cannot declare function ${name} because it's in a local scope`);
		syntax_assert(this.globals.has(name) === false, ref, `Global ${name} already exists`)

		const fn = this.declare_hidden_function(name, type, parameters);
		
		this.globals.set(name, fn);
	}

	declare_hidden_function (name: string, type: AtiumType, parameters: Array<Variable>) {
		const index = this.function_index;
		const fn = new FunctionDeclaration(index, type, parameters);

		this.function_index += 1;

		return fn;
	}
	
	get_variable (name: string): Variable | null {
		/*
		TODO
		at the moment this function would probably be
		better replaced with the callee doing something like
		
		ctx.environment?.get_variable(name)
		
		possibly with a assert for the environment existing.
		However, the plan is to implement global variables outside
		of the environment. It makes sense to do that check in
		else block of this function.
		*/
		if (this.environment !== null) {
			return this.environment.get_variable(name);
		}
		else {
			return null;
		}
	}
}