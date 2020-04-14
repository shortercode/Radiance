import { Writer } from "./Writer.js";
import { AtiumType, PrimativeTypes } from "../compiler/AtiumType.js";
import { Variable } from "../compiler/Variable.js";

export class FunctionContext {
	readonly writer: Writer
	readonly variable_lookup: Map<number, number> = new Map
	readonly function_lookup: Map<number, number>
	private value_stack: Array<PrimativeTypes> = []
	
	constructor (writer: Writer, function_lookup: Map<number, number>, locals: Array<Variable>) {
		this.writer = writer;
		this.function_lookup = function_lookup;
		let index = 0;
		for (const local of locals) {
			this.variable_lookup.set(local.id, index++);
		}
	}
	
	consume_value (type: PrimativeTypes) {
		const value = this.value_stack.pop();
		if (!value) {
			throw new Error("Unable to consume value; nothing on the stack");
		}
		if (type !== null && value !== type) {
			throw new Error(`Unable to consume value; expected ${type} but is ${value}`);
		}
	}
	
	consume_any_value() {
		const value = this.value_stack.pop();
		if (!value) {
			throw new Error("Unable to consume value; nothing on the stack");
		}
	}
	
	push_value (type: PrimativeTypes) {
		this.value_stack.push(type);
	}
	
	get stack_depth () {
		return this.value_stack.length;
	}
}