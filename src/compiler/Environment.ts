import { AtiumType } from "./AtiumType";
import { Variable } from "./Variable";
import { AST } from "./core";

type Frame = Map<string, Variable>

export class Environment {
	private frame_stack: Array<Frame> = [ new Map ]
	private id_counter: number
	variables: Array<Variable>
	
	constructor (parameters: Array<Variable>) {
		this.variables = parameters.slice(0);
		this.id_counter = this.variables.length;
		for (const param of parameters) {
			this.current_frame.set(param.name, param);
		}
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
	
	declare (node: AST, name: string, type: AtiumType): Variable {
		if (this.current_frame.has(name)) {
			throw new Error(`Variable ${name} already exists in the current scope`);
		}
		const variable = this.create_variable(node, name, type);
		this.current_frame.set(name, variable);
		return variable;
	}
	
	declare_hidden (node: AST, name: string, type: AtiumType): Variable {
		return this.create_variable(node, name, type);
	}
	
	private create_variable (node: AST, name: string, type: AtiumType): Variable {
		const variable = new Variable(node, type, name, this.id_counter++);
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