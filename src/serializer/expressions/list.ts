import { WASTExpressionNode, WASTNodeList } from "../../WASTNode";
import { FunctionContext } from "../FunctionContext";
import { Opcode } from "../OpCode";
import { compiler_error } from "../../compiler/error";

type WriteExpression = (ctx: FunctionContext, node: WASTExpressionNode) => void;

export function write_list_expression(ctx: FunctionContext, node: WASTExpressionNode, write_expression: WriteExpression) {
	const start_depth = ctx.stack_depth;
	const list_node = node as WASTNodeList;
	const statements = list_node.nodes;
	
	if (statements.length === 0) {
		return;
	}
	
	for (let i = 0; i < statements.length - 1; i++) {
		const subnode = statements[i];
		const start_depth = ctx.stack_depth;
		write_expression(ctx, subnode);
		const stack_delta = ctx.stack_depth - start_depth;
		if (subnode.value_type.is_void()) {
			if (stack_delta !== 0) {
				compiler_error(list_node.source, `Expected stack delta of 0, but found ${stack_delta}`)
			}
		}
		else if (stack_delta !== 1) {
			compiler_error(list_node.source, `Expected stack delta of 1, but found ${stack_delta}`)
		}
		else {
			ctx.consume_value(subnode.value_type.wasm_type(), subnode.source);
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

	const depth_delta = ctx.stack_depth - start_depth;
	
	if (list_node.value_type.is_void()) {
		if (depth_delta !== 0) {
			const stack = ctx.dump_stack_values(depth_delta);
			compiler_error(list_node.source, `Expected no values on the stack, but found ${ctx.stack_depth} [${stack.join(", ")}]`)
		}
	}
	else {
		if (depth_delta !== 1) {
			const stack = ctx.dump_stack_values(depth_delta);
			compiler_error(list_node.source, `Expected 1 value on the stack, but found ${ctx.stack_depth} [${stack.join(", ")}]`)
		}
	}
}