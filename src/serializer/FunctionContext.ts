import { Writer } from "./Writer.js";
import { PrimativeTypes, get_primative_name } from "../compiler/AtiumType.js";
import { Variable } from "../compiler/Variable.js";
import { SourceReference } from "../WASTNode.js";
import { compiler_assert } from "../compiler/error.js";

export class FunctionContext {
	readonly writer: Writer
	readonly variable_lookup: Map<number, number> = new Map
	readonly function_lookup: Map<number, number>
	readonly global_lookup: Map<number, number>

	private value_stack: Array<PrimativeTypes> = []
	
	constructor (writer: Writer, function_lookup: Map<number, number>, global_lookup: Map<number, number>, locals: Array<Variable>) {
		this.writer = writer;
		this.function_lookup = function_lookup;
		this.global_lookup = global_lookup;
		let index = 0;
		for (const local of locals) {
			this.variable_lookup.set(local.id, index++);
		}
	}
	
	consume_value (type: PrimativeTypes, ref: SourceReference) {
		const value = this.value_stack.pop()!;
		compiler_assert(typeof value !== "undefined", ref, "Unable to consume value; nothing on the stack");
		compiler_assert(value === type, ref, `Unable to consume value; expected ${get_primative_name(type)} but is ${get_primative_name(value)}`);
	}
	
	consume_any_value(ref: SourceReference) {
		const value = this.value_stack.pop();
		compiler_assert(typeof value !== "undefined", ref, "Unable to consume value; nothing on the stack");
	}
	
	push_value (type: PrimativeTypes) {
		this.value_stack.push(type);
	}
	
	get stack_depth () {
		return this.value_stack.length;
	}
}