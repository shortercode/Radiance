import { WASTExpressionNode, WASTNodeList } from "../../WASTNode";
import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { compiler_assert } from "../../compiler/error";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_list_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	
	const list_node = node as WASTNodeList;
	const statements = list_node.nodes;
	
	if (statements.length === 0)
	return;
	
	for (let i = 0; i < statements.length - 1; i++) {
		const subnode = statements[i];
		write_expression(ctx, subnode);
		if (subnode.value_type.is_void() === false) {
			ctx.consume_any_value(node.source);
			ctx.writer.writeUint8(Opcode.drop);
		}
	}
	
	{
		const last_subnode = statements[statements.length - 1];
		write_expression(ctx, last_subnode);
		const has_value = last_subnode.value_type.is_void() === false;
		const does_not_emit_value = list_node.value_type.is_void();
		if (has_value && does_not_emit_value) {
			ctx.consume_value(last_subnode.value_type.wasm_type(), node.source);
			ctx.writer.writeUint8(Opcode.drop);
		}
	}
	
	if (list_node.value_type.is_void()) {
		compiler_assert(ctx.stack_depth === 0, list_node.source, `Expected no values on the stack, but found ${ctx.stack_depth}`);
	}
	else {
		compiler_assert(ctx.stack_depth === 1, list_node.source, `Expected 1 value on the stack, but found ${ctx.stack_depth}`);
	}
}