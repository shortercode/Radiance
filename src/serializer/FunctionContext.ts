import { Writer } from "./Writer";
import { PrimativeTypes, get_primative_name } from "../compiler/LangType";
import { Variable } from "../compiler/Variable";
import { Ref, WASTDataNode } from "../WASTNode";
import { compiler_assert } from "../compiler/error";
import { ModuleContext } from "./ModuleContext";

export class FunctionContext {
	readonly writer: Writer
	readonly variable_lookup: Map<number, number> = new Map
	readonly function_lookup: Map<number, number>
	readonly data_lookup: Map<WASTDataNode, number>
	readonly global_lookup: Map<number, number>

	private value_stack: Array<PrimativeTypes> = []
	
	constructor (writer: Writer, module_ctx: ModuleContext, locals: Array<Variable>) {
		this.writer = writer;
		this.function_lookup = module_ctx.function_index_map;
		this.global_lookup = module_ctx.global_index_map;
		this.data_lookup = module_ctx.data_index_map;
		let index = 0;
		for (const local of locals) {
			this.variable_lookup.set(local.id, index++);
		}
	}
	
	consume_value (type: PrimativeTypes, ref: Ref) {
		const value = this.value_stack.pop()!;
		compiler_assert(typeof value !== "undefined", ref, "Unable to consume value; nothing on the stack");
		compiler_assert(value === type, ref, `Unable to consume value; expected ${get_primative_name(type)} but is ${get_primative_name(value)}`);
	}
	
	consume_any_value(ref: Ref) {
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