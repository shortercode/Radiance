import { WASTExpressionNode, WASTGetLocalNode, WASTNodeList, WASTStoreNode, WASTConstNode, WASTCallNode, WASTSetLocalNode } from "../../WASTNode";
import { Compiler, AST } from "../core";
import { I32_TYPE, AtiumType } from "../AtiumType";
import { is_defined, compiler_assert } from "../error";

export function create_object(compiler: Compiler, node: AST, type: AtiumType, values: Array<WASTExpressionNode>): WASTExpressionNode {
	const pointer = compiler.ctx.environment!.declare_hidden(node, "pointer", I32_TYPE);
	const get_pointer_expr = new WASTGetLocalNode(node, pointer.id, pointer.name, pointer.type);

	const result = new WASTNodeList(node);
	result.value_type = type;

	let value_offset = 0;
	for (const val of values) {
		const value_init = new WASTStoreNode(node, get_pointer_expr, value_offset, val);
		value_offset += val.value_type.size;
		result.nodes.push(value_init);
	}

	const malloc_fn = compiler.ctx.get_function("malloc")!;
	compiler_assert(is_defined(malloc_fn), node, "Unable to locate malloc function");

	const call_malloc_expr = new WASTCallNode(node, malloc_fn.id, "malloc_temp", type, [
		new WASTConstNode(node, I32_TYPE, value_offset.toString())
	]);

	const set_pointer_expr = new WASTSetLocalNode(node, pointer.id, pointer.name, call_malloc_expr);
	
	result.nodes.unshift(set_pointer_expr); // add to FRONT
	result.nodes.push(get_pointer_expr);

	return result;
}