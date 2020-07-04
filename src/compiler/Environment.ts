import { Declaration } from "./Declaration";
import { Ref } from "../WASTNode";
import { type_assert } from "./error";
import { Variable } from "./Variable";
import { FunctionDeclaration } from "./FunctionDeclaration";
import { LangType } from "./LangType";

type Frame = Map<string, Declaration>

export class Environment {
	readonly stack: Array<Frame> = [ new Map ]
	readonly variables: Array<Variable> = []
	readonly free_temp_variables: Set<Variable> = new Set()

	get frame () {
		return this.stack[0];
	}

	declare (ref: Ref, name: string, decl: Declaration): Declaration {
		type_assert(this.frame.has(name) === false, ref, `Unable to declare "${name}", as it's already been declared in this scope.`);
		this.frame.set(name, decl);
		if (decl instanceof Variable) {
			this.variables.push(decl);	
		}
		return decl;
	}
	get (name: string): Declaration | null {
		for (const frame of this.stack) {
			const value = frame.get(name);
			if (value) {
				return value
			}
		}
		return null;
	}
	pop () {
		this.stack.shift();
	}
	push () {
		this.stack.unshift(new Map);
	}

	get_temp_variable (type: LangType) {
		const set = this.free_temp_variables;
		for (const variable of set) {
			if (variable.type.exact_equals(type)) {
				set.delete(variable);
				return variable;
			}
		}
		{
			const variable = new Variable(Ref.unknown(), type, `temp_var_${type.name}`);
			this.variables.push(variable);
			return variable;
		}
	}
	free_temp_variable (variable: Variable) {
		// NOTE this doesn't check if the variable actually belongs to this function
		this.free_temp_variables.add(variable);
	}
}

export class ModuleEnvironment extends Environment {
	readonly variables: Array<Variable> = []

	declare (ref: Ref, name: string, decl: Declaration): Declaration {
		if (decl instanceof Variable && this.stack.length === 1) {
			decl.is_global = true;
		}
		return super.declare(ref, name, decl);
	} 
}

export class FunctionEnvironment extends Environment {
	readonly fn: FunctionDeclaration

	constructor (decl: FunctionDeclaration) {
		super();
		this.fn = decl;
		for (const param of decl.parameters) {
			this.declare(param.source, param.name, param);
		}
	}
}