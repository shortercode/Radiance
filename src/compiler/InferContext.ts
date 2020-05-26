import { Context } from "./Context";
import { LangType } from "./LangType";

type Frame = Map<string, LangType>
type TypeHint = LangType | null

class InferEnvironment {
	private frame_stack: Array<Frame> = [ new Map ]

	push_frame () {
		this.frame_stack.unshift(new Map);
	}
	
	pop_frame () {
		this.frame_stack.shift();
	}

	get current_frame (): Frame {
		return this.frame_stack[0]!;
	}

	declare (name: string, type: LangType) {
		const frame = this.current_frame;
		if (frame.has(name)) {
			return null
		}
		frame.set(name, type);
	}

	get (name: string): TypeHint {
		return this.current_frame.get(name) || null;
	}
}

export class InferContext {
	readonly ctx: Context
	readonly environment: InferEnvironment = new InferEnvironment

	constructor (ctx: Context) {
		this.ctx = ctx;
	}

	get_variable_type (name: string): TypeHint {
		let variable = this.ctx.get_variable(name);
		if (variable) {
			return variable.type;
		}
		return this.environment.get(name);
	}

	get_function_type (name: string): TypeHint {
		let fn = this.ctx.get_function(name);
		return fn ? fn.type : null;
	}
}