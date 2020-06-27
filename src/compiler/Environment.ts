import { LangType, I32_TYPE } from "./LangType";
import { Variable } from "./Variable";
import { Ref } from "../WASTNode";
import { FunctionDeclaration } from "./FunctionDeclaration";

type Frame = Map<string, Variable>
type ArrayAccessVariables = { index: Variable, target: Variable, length: Variable }

export class Environment {
	private frame_stack: Array<Frame> = [ new Map ]
	variables: Array<Variable>
	private array_access_varables: ArrayAccessVariables|null = null
	readonly fn_type: FunctionDeclaration
	
	constructor (decl: FunctionDeclaration) {
		this.variables = decl.parameters.slice(0);
		for (const param of decl.parameters) {
			this.current_frame.set(param.name, param);
		}
		this.fn_type = decl;
	}
	
	get current_frame () {
		return this.frame_stack[0];
	}
	
	push_frame () {
		this.frame_stack.unshift(new Map);
	}
	
	pop_frame () {
		this.frame_stack.shift();
	}
	
	declare (ref: Ref, name: string, type: LangType): Variable {
		if (this.current_frame.has(name)) {
			throw new Error(`Variable ${name} already exists in the current scope`);
		}
		const variable = this.create_variable(ref, name, type);
		this.current_frame.set(name, variable);
		return variable;
	}
	
	declare_hidden (ref: Ref, name: string, type: LangType): Variable {
		return this.create_variable(ref, name, type);
	}

	get_array_variables (ref: Ref) {
		if (this.array_access_varables === null) {
			// WARN isn't really correct using the node of the first accessor
			this.array_access_varables = {
				index: this.declare_hidden(ref, "index", I32_TYPE),
				target: this.declare_hidden(ref, "target", I32_TYPE),
				length: this.declare_hidden(ref, "length", I32_TYPE)
			};
		}
		return this.array_access_varables;
	}
	
	private create_variable (ref: Ref, name: string, type: LangType): Variable {
		const variable = new Variable(ref, type, name, false);
		this.variables.push(variable);
		return variable;
	} 
	
	get_variable (name: string): Variable | null {
		for (const frame of this.frame_stack) {
			const value = frame.get(name);
			if (value) {
				return value;
			}
		}
		return null;
	}
}