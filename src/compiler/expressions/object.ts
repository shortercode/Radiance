import { WASTExpressionNode, WASTNodeList, WASTStoreNode, WASTConstNode, WASTCallNode, Ref, WASTSetVarNode, WASTGetVarNode, WASTVarRestoreNode } from "../../WASTNode";
import { Compiler } from "../core";
import { I32_TYPE, LangType } from "../LangType";
import { is_defined, compiler_assert, compiler_error } from "../error";
import { Context } from "../Context";
import { FunctionDeclaration } from "../FunctionDeclaration";

export function create_object(compiler: Compiler, ref: Ref, type: LangType, values: Array<WASTExpressionNode>, min_size: number = 0): WASTExpressionNode {
	const pointer = declare_pointer(compiler.ctx, ref);
	const get_pointer_expr = new WASTGetVarNode(pointer, ref);

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

function declare_pointer (ctx: Context, ref: Ref) {
	const VAR_NAME = "constructor_pointer";
	if (ctx.is_inside_function) {
		return ctx.get_environment(ref).declare_hidden(ref, VAR_NAME, I32_TYPE);
	}
	else {
		let ptr = ctx.lib_globals.get(VAR_NAME);
		if (!ptr) {
			ptr = ctx.declare_library_global_variable(ref, VAR_NAME, I32_TYPE);
		}
		else if (ptr instanceof FunctionDeclaration) {
			compiler_error(ref, `Global object constructor pointer has become a FunctionDeclaration.`);
		}
		return ptr;
	}
}