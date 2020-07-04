import { WASTExpressionNode, WASTNodeList, WASTStoreNode, WASTConstNode, WASTCallNode, Ref, WASTSetVarNode, WASTGetVarNode, WASTVarRestoreNode } from "../../WASTNode";
import { Compiler } from "../core";
import { I32_TYPE, LangType } from "../LangType";
import { is_defined, compiler_assert } from "../error";

export function create_object(compiler: Compiler, ref: Ref, type: LangType, values: Array<WASTExpressionNode>, min_size: number = 0): WASTExpressionNode {
	// const pointer = declare_pointer(compiler.ctx, ref);
	const [pointer, release_pointer] = compiler.ctx.get_temp_variable(I32_TYPE);
	const get_pointer_expr = new WASTGetVarNode(pointer, ref);

	// NOTE we release this early, because it's expected that pointer will be reused
	// in a recursive manner. VarRestore ensures that this won't cause problems
	release_pointer();

	const result = new WASTNodeList(ref);
	result.value_type = type;

	let value_offset = 0;
	for (const val of values) {
		const value_init = new WASTStoreNode(val.source, get_pointer_expr, value_offset, val);
		// NOTE the store expression MAY modify the pointer value, as it's a reused
		// variable. But we must ensure it stays the same for the duration of obj
		// creation. Hence use VarRestore to ensure the value is the same after
		// the expression
		const restore_node = new WASTVarRestoreNode(pointer, value_init);
		value_offset += val.value_type.size;
		result.nodes.push(restore_node);
	}

	const final_size = Math.max(min_size, value_offset);

	const malloc_fn = compiler.ctx.get_function("malloc")!;
	compiler_assert(is_defined(malloc_fn), ref, "Unable to locate malloc function");

	const call_malloc_expr = new WASTCallNode(ref, malloc_fn.id, "malloc_temp", type, [
		new WASTConstNode(ref, I32_TYPE, final_size.toString())
	]);

	const set_pointer_expr = new WASTSetVarNode(pointer, call_malloc_expr, ref);
	
	result.nodes.unshift(set_pointer_expr); // add to FRONT
	result.nodes.push(get_pointer_expr);

	return result;
}