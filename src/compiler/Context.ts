import { FunctionDeclaration } from "./FunctionDeclaration.js";
import { Environment } from "./Environment.js";
import { AtiumType } from "./AtiumType.js";
import { Variable } from "./Variable.js";

export class Context {
	globals: Map<string, FunctionDeclaration> = new Map
	environment: Environment | null = null
	
	declare_variable (name: string, type: AtiumType): Variable {
		if (this.environment === null)
		throw new Error("Cannot declare global variable");
		
		return this.environment.declare(name, type);
	}
	
	declare_function (name: string, type: AtiumType, parameters: Array<Variable>) {
		if (this.environment !== null)
		throw new Error("Cannot declare local function");
		
		if (this.globals.has(name))
		throw new Error(`Global ${name} already exists`);
		
		const fn = new FunctionDeclaration(type, parameters);
		
		this.globals.set(name, fn);
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